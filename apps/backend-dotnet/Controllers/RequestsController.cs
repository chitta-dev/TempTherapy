using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TherapyCare.Api.Data;
using TherapyCare.Api.Dtos;
using TherapyCare.Api.Hubs;
using TherapyCare.Api.Models;
using TherapyCare.Api.Services;

namespace TherapyCare.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RequestsController : ControllerBase
{
    private readonly TherapyDbContext _context;
    private readonly PricingService _pricingService;
    private readonly IHubContext<TherapyHub> _hubContext;
    private readonly ILogger<RequestsController> _logger;

    public RequestsController(
        TherapyDbContext context, 
        PricingService pricingService,
        IHubContext<TherapyHub> hubContext,
        ILogger<RequestsController> logger)
    {
        _context = context;
        _pricingService = pricingService;
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetRequests([FromQuery] string? patientId)
    {
        var query = _context.ServiceRequests
            .Include(r => r.Patient)
            .Include(r => r.Category)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(patientId))
        {
            query = query.Where(r => r.PatientId == patientId);
        }

        var requests = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return Ok(requests);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetRequest(string id)
    {
        var request = await _context.ServiceRequests
            .Include(r => r.Patient)
            .Include(r => r.Category)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null)
        {
            return NotFound(new { message = $"Service request with ID '{id}' not found." });
        }

        return Ok(request);
    }

    private static string CleanPhoneNumber(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length == 10)
        {
            return $"+91 {digits.Substring(0, 5)} {digits.Substring(5)}";
        }
        if (digits.Length == 12 && digits.StartsWith("91"))
        {
            return $"+91 {digits.Substring(2, 5)} {digits.Substring(7)}";
        }
        return phone.Trim();
    }

    [HttpPost]
    public async Task<IActionResult> CreateRequest([FromBody] CreateServiceRequestDto dto)
    {
        User? patient = null;
        if (!string.IsNullOrWhiteSpace(dto.PatientId))
        {
            patient = await _context.Users.FindAsync(dto.PatientId);
        }

        // 1. If PatientName or PatientPhone is provided, find existing or register a new Patient user
        if (patient == null && (!string.IsNullOrWhiteSpace(dto.PatientPhone) || !string.IsNullOrWhiteSpace(dto.PatientName)))
        {
            var rawPhone = dto.PatientPhone ?? "";
            var cleanPhone = CleanPhoneNumber(rawPhone);
            var cleanEmail = dto.PatientEmail?.Trim().ToLower();

            // Check if patient with matching phone or email already exists
            patient = await _context.Users.FirstOrDefaultAsync(u =>
                (cleanPhone.Length > 0 && u.PhoneNumber != null && u.PhoneNumber == cleanPhone) ||
                (cleanEmail != null && u.Email != null && u.Email.ToLower() == cleanEmail));

            if (patient == null)
            {
                var newPatientId = $"usr_patient_{DateTime.UtcNow.Ticks % 1000000}";
                var digitsOnly = new string(cleanPhone.Where(char.IsDigit).ToArray());
                var fallbackEmail = digitsOnly.Length > 0 
                    ? $"{digitsOnly}@patient.therapyhub.health" 
                    : $"patient_{newPatientId}@therapyhub.health";

                patient = new User
                {
                    Id = newPatientId,
                    FullName = !string.IsNullOrWhiteSpace(dto.PatientName) ? dto.PatientName.Trim() : "Patient",
                    PhoneNumber = cleanPhone,
                    Email = cleanEmail ?? fallbackEmail,
                    Role = UserRole.Patient,
                    PasswordHash = PasswordSecurity.HashPassword("password@1234"),
                    IsActivated = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(patient);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Registered new Patient user: {PatientId} ({FullName})", patient.Id, patient.FullName);
            }
        }

        patient ??= await _context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Patient);

        if (patient == null)
        {
            return BadRequest(new { message = "No registered patient found in the system." });
        }

        var categoryId = dto.CategoryId ?? "cat_ortho";
        var category = await _context.Categories.FindAsync(categoryId);
        if (category == null)
        {
            return BadRequest(new { message = $"Invalid CategoryId: '{categoryId}'." });
        }

        var urgency = UrgencyLevel.ROUTINE;
        if (!string.IsNullOrEmpty(dto.Urgency) && Enum.TryParse<UrgencyLevel>(dto.Urgency, true, out var parsedUrgency))
        {
            urgency = parsedUrgency;
        }

        int totalSessions = Math.Clamp(dto.TotalSessions ?? 1, 1, 30);
        var (discountPct, defaultTierName) = PricingService.GetPackageTier(totalSessions);
        var finalPackageName = !string.IsNullOrWhiteSpace(dto.PackageName) ? dto.PackageName : defaultTierName;
        var freq = (dto.Frequency ?? "ALTERNATE_DAYS").Trim().ToUpperInvariant();
        DateTime baseStartTime = dto.ScheduledStart ?? DateTime.UtcNow.AddMinutes(30);
        int durationMinutes = category.EstimatedDurationMinutes;

        TherapistProfile? therapist = null;
        var sessionSlots = new List<(int Index, DateTime Start, DateTime End)>();

        if (!string.IsNullOrWhiteSpace(dto.TherapistId))
        {
            therapist = await _context.TherapistProfiles
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == dto.TherapistId);

            if (therapist == null)
            {
                return BadRequest(new { message = $"Therapist with ID '{dto.TherapistId}' not found." });
            }

            if (!therapist.IsAvailable)
            {
                return BadRequest(new { message = $"Therapist Dr. {therapist.User?.FullName ?? "Selected"} is currently marked as off-duty/unavailable." });
            }

            // 1. Calculate schedule dates for each session
            for (int i = 0; i < totalSessions; i++)
            {
                DateTime slotStart;
                if (dto.CustomSessionDates != null && i < dto.CustomSessionDates.Count && dto.CustomSessionDates[i] > DateTime.MinValue)
                {
                    slotStart = dto.CustomSessionDates[i];
                }
                else
                {
                    slotStart = freq switch
                    {
                        "DAILY" => baseStartTime.AddDays(i),
                        "WEEKLY" => baseStartTime.AddDays(i * 7),
                        "TWICE_WEEKLY" => baseStartTime.AddDays((i / 2) * 7 + (i % 2 == 1 ? 3 : 0)),
                        _ => baseStartTime.AddDays(i * 2) // ALTERNATE_DAYS
                    };
                }
                var slotEnd = slotStart.AddMinutes(durationMinutes);
                sessionSlots.Add((i + 1, slotStart, slotEnd));
            }

            // 2. Validate therapist availability for all slots
            var conflictTherapistName = therapist.User?.FullName?.StartsWith("Dr.") == true 
                ? therapist.User.FullName 
                : $"Dr. {therapist.User?.FullName ?? "Selected"}";

            foreach (var slot in sessionSlots)
            {
                var conflictingAppointment = await _context.Appointments
                    .Where(a => a.TherapistId == therapist.Id
                        && a.Status != AppointmentStatus.CANCELLED
                        && a.Status != AppointmentStatus.COMPLETED
                        && ((slot.Start >= a.ScheduledStart && slot.Start < a.ScheduledEnd)
                            || (slot.End > a.ScheduledStart && slot.End <= a.ScheduledEnd)
                            || (slot.Start <= a.ScheduledStart && slot.End >= a.ScheduledEnd)))
                    .FirstOrDefaultAsync();

                if (conflictingAppointment != null)
                {
                    return BadRequest(new
                    {
                        message = $"Scheduling conflict on Session {slot.Index} of {totalSessions} ({slot.Start:ddd, MMM dd 'at' hh:mm tt}): Therapist {conflictTherapistName} is already booked from {conflictingAppointment.ScheduledStart:hh:mm tt} to {conflictingAppointment.ScheduledEnd:hh:mm tt}. Please choose an available time or therapist."
                    });
                }
            }
        }

        var newRequest = new ServiceRequest
        {
            Id = $"req_{DateTime.UtcNow.Ticks % 1000000}",
            PatientId = patient.Id,
            Patient = patient,
            CategoryId = category.Id,
            Category = category,
            TargetArea = string.IsNullOrWhiteSpace(dto.TargetArea) ? "Full Body / Spine" : dto.TargetArea,
            PainSeverity = dto.PainSeverity is >= 1 and <= 10 ? dto.PainSeverity.Value : 5,
            ChiefComplaint = dto.ChiefComplaint ?? string.Empty,
            PreferredDate = string.IsNullOrWhiteSpace(dto.PreferredDate) ? "Today" : dto.PreferredDate,
            PreferredTimeSlot = string.IsNullOrWhiteSpace(dto.PreferredTimeSlot) ? "Morning (9 AM - 12 PM)" : dto.PreferredTimeSlot,
            AddressLine = string.IsNullOrWhiteSpace(dto.AddressLine) ? "Indiranagar, Bengaluru" : dto.AddressLine,
            Latitude = dto.Latitude ?? 12.9716,
            Longitude = dto.Longitude ?? 77.5946,
            Status = therapist != null ? RequestStatus.ASSIGNED : RequestStatus.PENDING_TRIAGE,
            Urgency = urgency,
            TotalSessions = totalSessions,
            PackageName = finalPackageName,
            OfflineConsultationNotes = dto.OfflineConsultationNotes,
            CreatedAt = DateTime.UtcNow
        };

        _context.ServiceRequests.Add(newRequest);

        var createdAppointments = new List<Appointment>();
        if (therapist != null)
        {
            double distanceKm = CalculateDistanceKm(
                therapist.CurrentLatitude, therapist.CurrentLongitude,
                newRequest.Latitude, newRequest.Longitude
            );

            decimal basePrice = category.BasePrice;
            var fee = _pricingService.CalculatePackageSessionFee(basePrice, distanceKm, newRequest.Urgency, totalSessions);

            var paymentMode = PaymentMode.CASH;
            if (!string.IsNullOrEmpty(dto.PaymentMode) && Enum.TryParse<PaymentMode>(dto.PaymentMode, true, out var parsedMode))
            {
                paymentMode = parsedMode;
            }

            var timestampTicks = DateTime.UtcNow.Ticks;
            for (int i = 0; i < sessionSlots.Count; i++)
            {
                var slot = sessionSlots[i];
                var appointment = new Appointment
                {
                    Id = totalSessions == 1 ? $"apt_{timestampTicks % 1000000}" : $"apt_{timestampTicks % 1000000}_{slot.Index}",
                    RequestId = newRequest.Id,
                    Request = newRequest,
                    PatientId = patient.Id,
                    Patient = patient,
                    TherapistId = therapist.Id,
                    Therapist = therapist,
                    Status = AppointmentStatus.ASSIGNED,
                    ScheduledStart = slot.Start,
                    ScheduledEnd = slot.End,
                    ArrivalOtp = Random.Shared.Next(1000, 9999).ToString(),
                    CompletionOtp = Random.Shared.Next(1000, 9999).ToString(),
                    BaseFee = fee.BaseFee,
                    DistanceTierFee = fee.DistanceTierFee,
                    UrgentFee = fee.UrgentFee,
                    PlatformFee = fee.PlatformFee,
                    Tax = fee.Tax,
                    TotalFee = fee.TotalFee,
                    PaymentMode = paymentMode,
                    PaymentStatus = PaymentStatus.PENDING,
                    SessionIndex = slot.Index,
                    TotalSessions = totalSessions,
                    PackageName = finalPackageName,
                    OfflineConsultationNotes = dto.OfflineConsultationNotes,
                    ClinicalNotes = totalSessions == 1
                        ? $"Direct intake & dispatch: {newRequest.ChiefComplaint}"
                        : $"[Session {slot.Index} of {totalSessions} - {finalPackageName}] Offline consultation: {dto.OfflineConsultationNotes ?? newRequest.ChiefComplaint}",
                    CreatedAt = DateTime.UtcNow.AddMilliseconds(i)
                };

                createdAppointments.Add(appointment);
                _context.Appointments.Add(appointment);
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("New service request created: {RequestId} for patient {PatientId} (Care plan: {Sessions} sessions)", 
            newRequest.Id, patient.Id, totalSessions);

        // Real-Time SignalR Broadcasts
        await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveNewRequest", newRequest);

        foreach (var apt in createdAppointments)
        {
            await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveAppointmentAssigned", apt);
            await _hubContext.Clients.Group($"patient_{patient.Id}").SendAsync("ReceiveAppointmentAssigned", apt);
            if (therapist != null)
            {
                await _hubContext.Clients.Group($"clinician_{therapist.Id}").SendAsync("ReceiveAppointmentAssigned", apt);
            }
        }

        var therapistDisplayName = therapist != null
            ? (therapist.User?.FullName?.StartsWith("Dr.") == true ? therapist.User.FullName : $"Dr. {therapist.User?.FullName ?? "Therapist"}")
            : "";

        var message = therapist != null
            ? (totalSessions == 1
                ? $"Patient '{patient.FullName}' registered and {therapistDisplayName} dispatched for {createdAppointments[0].ScheduledStart:MMM dd, yyyy hh:mm tt}!"
                : $"Patient '{patient.FullName}' registered & {totalSessions}-Session Care Plan ({finalPackageName}) scheduled with {therapistDisplayName}!")
            : (totalSessions == 1
                ? $"New patient '{patient.FullName}' registered and triage request #{newRequest.Id} created!"
                : $"New patient '{patient.FullName}' registered and {totalSessions}-Session Care Plan saved to Pending Triage!");

        var totalPackageAmount = createdAppointments.Sum(a => a.TotalFee);

        return Ok(new
        {
            success = true,
            message,
            request = newRequest,
            totalSessions,
            packageName = finalPackageName,
            discountPercent = discountPct,
            totalPackageAmount,
            appointment = createdAppointments.FirstOrDefault(),
            appointments = createdAppointments,
            patient = new
            {
                patient.Id,
                patient.FullName,
                patient.Email,
                patient.PhoneNumber,
                patient.Role
            }
        });
    }

    private static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371.0;
        double dLat = ToRadians(lat2 - lat1);
        double dLon = ToRadians(lon2 - lon1);

        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                   Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return Math.Round(R * c, 2);
    }

    private static double ToRadians(double degrees)
    {
        return degrees * (Math.PI / 180.0);
    }
}

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
public class AppointmentsController : ControllerBase
{
    private readonly TherapyDbContext _context;
    private readonly PricingService _pricingService;
    private readonly IHubContext<TherapyHub> _hubContext;
    private readonly ILogger<AppointmentsController> _logger;

    public AppointmentsController(
        TherapyDbContext context,
        PricingService pricingService,
        IHubContext<TherapyHub> hubContext,
        ILogger<AppointmentsController> logger)
    {
        _context = context;
        _pricingService = pricingService;
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAppointments(
        [FromQuery] string? patientId, 
        [FromQuery] string? therapistId, 
        [FromQuery] string? status)
    {
        var query = _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Request)
                .ThenInclude(r => r!.Category)
            .Include(a => a.Therapist)
                .ThenInclude(t => t!.User)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(patientId))
        {
            query = query.Where(a => a.PatientId == patientId);
        }

        if (!string.IsNullOrWhiteSpace(therapistId))
        {
            query = query.Where(a => a.TherapistId == therapistId || (a.Therapist != null && a.Therapist.UserId == therapistId));
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<AppointmentStatus>(status, true, out var aptStatus))
        {
            query = query.Where(a => a.Status == aptStatus);
        }

        var appointments = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(appointments);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAppointment(string id)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Request)
                .ThenInclude(r => r!.Category)
            .Include(a => a.Therapist)
                .ThenInclude(t => t!.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            return NotFound(new { message = $"Appointment with ID '{id}' not found." });
        }

        return Ok(appointment);
    }

    [HttpPost]
    [HttpPost("/api/dispatch/assign")]
    public async Task<IActionResult> AssignAppointment([FromBody] AssignAppointmentDto dto)
    {
        var request = await _context.ServiceRequests
            .Include(r => r.Category)
            .FirstOrDefaultAsync(r => r.Id == dto.RequestId);

        if (request == null)
        {
            return BadRequest(new { message = $"Request with ID '{dto.RequestId}' not found." });
        }

        var therapist = await _context.TherapistProfiles
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == dto.TherapistId);

        if (therapist == null)
        {
            return BadRequest(new { message = $"Therapist with ID '{dto.TherapistId}' not found." });
        }

        var patient = await _context.Users.FindAsync(request.PatientId);
        if (patient == null)
        {
            return BadRequest(new { message = "Patient record not found." });
        }

        if (!therapist.IsAvailable)
        {
            return BadRequest(new { message = $"Therapist Dr. {therapist.User?.FullName ?? "Selected"} is currently marked as off-duty/unavailable." });
        }

        int sessions = dto.TotalSessions.HasValue && dto.TotalSessions.Value > 0 ? dto.TotalSessions.Value : 1;
        return await InternalScheduleSessionsAsync(
            request,
            therapist,
            patient,
            sessions,
            dto.Frequency ?? "ALTERNATE_DAYS",
            dto.ScheduledStart,
            dto.PaymentMode,
            dto.OfflineConsultationNotes,
            dto.PackageName,
            dto.CustomSessionDates
        );
    }

    [HttpPost("batch-schedule")]
    [HttpPost("/api/dispatch/batch-schedule")]
    public async Task<IActionResult> BatchSchedule([FromBody] BatchScheduleDto dto)
    {
        var request = await _context.ServiceRequests
            .Include(r => r.Category)
            .FirstOrDefaultAsync(r => r.Id == dto.RequestId);

        if (request == null)
        {
            return BadRequest(new { message = $"Request with ID '{dto.RequestId}' not found." });
        }

        var therapist = await _context.TherapistProfiles
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == dto.TherapistId);

        if (therapist == null)
        {
            return BadRequest(new { message = $"Therapist with ID '{dto.TherapistId}' not found." });
        }

        var patient = await _context.Users.FindAsync(request.PatientId);
        if (patient == null)
        {
            return BadRequest(new { message = "Patient record not found." });
        }

        if (!therapist.IsAvailable)
        {
            return BadRequest(new { message = $"Therapist Dr. {therapist.User?.FullName ?? "Selected"} is currently marked as off-duty/unavailable." });
        }

        int sessions = dto.TotalSessions > 0 ? dto.TotalSessions : 1;
        return await InternalScheduleSessionsAsync(
            request,
            therapist,
            patient,
            sessions,
            dto.Frequency ?? "ALTERNATE_DAYS",
            dto.ScheduledStart,
            dto.PaymentMode,
            dto.OfflineConsultationNotes,
            dto.PackageName,
            dto.CustomSessionDates
        );
    }

    private async Task<IActionResult> InternalScheduleSessionsAsync(
        ServiceRequest request,
        TherapistProfile therapist,
        User patient,
        int totalSessions,
        string? frequency,
        DateTime? scheduledStart,
        string? paymentModeStr,
        string? offlineNotes,
        string? packageName,
        List<DateTime>? customDates)
    {
        totalSessions = Math.Clamp(totalSessions, 1, 30);
        var baseStartTime = scheduledStart ?? DateTime.UtcNow.AddMinutes(30);
        int durationMinutes = request.Category?.EstimatedDurationMinutes ?? 60;
        var freq = (frequency ?? "ALTERNATE_DAYS").Trim().ToUpperInvariant();

        // 1. Calculate schedule dates for each session
        var sessionSlots = new List<(int Index, DateTime Start, DateTime End)>();
        for (int i = 0; i < totalSessions; i++)
        {
            DateTime slotStart;
            if (customDates != null && i < customDates.Count && customDates[i] > DateTime.MinValue)
            {
                slotStart = customDates[i];
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

        // 2. Comprehensive conflict detection across ALL generated slots
        var therapistDisplayName = therapist.User?.FullName?.StartsWith("Dr.") == true
            ? therapist.User.FullName
            : $"Dr. {therapist.User?.FullName ?? "Selected"}";

        foreach (var slot in sessionSlots)
        {
            var conflict = await _context.Appointments
                .Where(a => a.TherapistId == therapist.Id
                    && a.Status != AppointmentStatus.CANCELLED
                    && a.Status != AppointmentStatus.COMPLETED
                    && ((slot.Start >= a.ScheduledStart && slot.Start < a.ScheduledEnd)
                        || (slot.End > a.ScheduledStart && slot.End <= a.ScheduledEnd)
                        || (slot.Start <= a.ScheduledStart && slot.End >= a.ScheduledEnd)))
                .FirstOrDefaultAsync();

            if (conflict != null)
            {
                return BadRequest(new
                {
                    message = $"Scheduling collision on Session {slot.Index} of {totalSessions} ({slot.Start:ddd, MMM dd 'at' hh:mm tt}): Therapist {therapistDisplayName} is already booked from {conflict.ScheduledStart:hh:mm tt} to {conflict.ScheduledEnd:hh:mm tt}. Please choose an alternate start time or available therapist."
                });
            }
        }

        // 3. Package pricing calculation
        double distanceKm = CalculateDistanceKm(
            therapist.CurrentLatitude, therapist.CurrentLongitude,
            request.Latitude, request.Longitude
        );

        decimal basePrice = request.Category?.BasePrice ?? 850.00m;
        var fee = _pricingService.CalculatePackageSessionFee(basePrice, distanceKm, request.Urgency, totalSessions);
        var (discountPct, defaultTierName) = PricingService.GetPackageTier(totalSessions);
        var finalPackageName = !string.IsNullOrWhiteSpace(packageName) ? packageName : defaultTierName;

        var paymentMode = PaymentMode.CARD;
        if (!string.IsNullOrEmpty(paymentModeStr) && Enum.TryParse<PaymentMode>(paymentModeStr, true, out var parsedMode))
        {
            paymentMode = parsedMode;
        }

        // 4. Atomically create all Appointment records
        var createdAppointments = new List<Appointment>();
        var timestampTicks = DateTime.UtcNow.Ticks;

        for (int i = 0; i < sessionSlots.Count; i++)
        {
            var slot = sessionSlots[i];
            var arrivalOtp = Random.Shared.Next(1000, 9999).ToString();
            var completionOtp = Random.Shared.Next(1000, 9999).ToString();

            var appointment = new Appointment
            {
                Id = totalSessions == 1 ? $"apt_{timestampTicks % 1000000}" : $"apt_{timestampTicks % 1000000}_{slot.Index}",
                RequestId = request.Id,
                Request = request,
                PatientId = patient.Id,
                Patient = patient,
                TherapistId = therapist.Id,
                Therapist = therapist,
                Status = AppointmentStatus.ASSIGNED,
                ScheduledStart = slot.Start,
                ScheduledEnd = slot.End,
                ArrivalOtp = arrivalOtp,
                CompletionOtp = completionOtp,
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
                OfflineConsultationNotes = offlineNotes,
                ClinicalNotes = totalSessions == 1
                    ? $"[Single Visit - {finalPackageName}] {offlineNotes ?? request.ChiefComplaint}"
                    : $"[Session {slot.Index} of {totalSessions} - {finalPackageName}] Offline consultation: {offlineNotes ?? "Care plan confirmed with patient."}",
                CreatedAt = DateTime.UtcNow.AddMilliseconds(i)
            };

            createdAppointments.Add(appointment);
            _context.Appointments.Add(appointment);
        }

        request.Status = RequestStatus.ASSIGNED;
        request.TotalSessions = totalSessions;
        request.PackageName = finalPackageName;
        request.OfflineConsultationNotes = offlineNotes;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Scheduled care plan: {TotalSessions} sessions for Request: {RequestId} with Therapist: {TherapistId}",
            totalSessions, request.Id, therapist.Id);

        // 5. SignalR Broadcasts
        foreach (var apt in createdAppointments)
        {
            await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveAppointmentAssigned", apt);
            await _hubContext.Clients.Group($"patient_{patient.Id}").SendAsync("ReceiveAppointmentAssigned", apt);
            await _hubContext.Clients.Group($"clinician_{therapist.Id}").SendAsync("ReceiveAppointmentAssigned", apt);
        }

        var totalPackageAmount = createdAppointments.Sum(a => a.TotalFee);

        return Ok(new
        {
            success = true,
            message = totalSessions == 1
                ? $"Therapist {therapistDisplayName} assigned successfully for {createdAppointments[0].ScheduledStart:MMM dd, yyyy hh:mm tt}!"
                : $"Care Plan confirmed! Successfully scheduled {totalSessions} sessions ({finalPackageName}) for {patient.FullName} with {therapistDisplayName}.",
            totalSessions,
            packageName = finalPackageName,
            discountPercent = discountPct,
            totalPackageAmount,
            perSessionFee = fee.TotalFee,
            appointment = createdAppointments[0],
            appointments = createdAppointments
        });
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateVisitStatusDto dto)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Request)
            .Include(a => a.Therapist)
                .ThenInclude(t => t!.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            return NotFound(new { message = $"Appointment with ID '{id}' not found." });
        }

        if (!Enum.TryParse<AppointmentStatus>(dto.Status, true, out var newStatus))
        {
            return BadRequest(new { message = $"Invalid status value: '{dto.Status}'." });
        }

        appointment.Status = newStatus;

        if (!string.IsNullOrWhiteSpace(dto.ClinicalNotes))
        {
            appointment.ClinicalNotes = string.IsNullOrWhiteSpace(appointment.ClinicalNotes)
                ? dto.ClinicalNotes
                : $"{appointment.ClinicalNotes}\n[{DateTime.UtcNow:HH:mm}] {dto.ClinicalNotes}";
        }

        if (newStatus == AppointmentStatus.COMPLETED)
        {
            appointment.PaymentStatus = PaymentStatus.SETTLED;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Appointment {AppointmentId} status updated to {Status}", appointment.Id, newStatus);

        // Real-Time SignalR Broadcast across channels
        var statusPayload = new 
        {
            appointmentId = appointment.Id,
            status = newStatus.ToString(),
            clinicalNotes = appointment.ClinicalNotes,
            updatedAt = DateTime.UtcNow
        };

        await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveVisitStatusUpdated", statusPayload);
        await _hubContext.Clients.Group($"patient_{appointment.PatientId}").SendAsync("ReceiveVisitStatusUpdated", statusPayload);
        await _hubContext.Clients.Group($"appointment_{appointment.Id}").SendAsync("ReceiveVisitStatusUpdated", statusPayload);

        return Ok(appointment);
    }

    [HttpPatch("{id}/verify-otp")]
    public async Task<IActionResult> VerifyOtp(string id, [FromBody] VerifyOtpDto dto)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            return NotFound(new { message = $"Appointment with ID '{id}' not found." });
        }

        if (string.Equals(appointment.ArrivalOtp, dto.Otp?.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            appointment.Status = AppointmentStatus.IN_SESSION;
            await _context.SaveChangesAsync();

            var payload = new 
            {
                appointmentId = appointment.Id,
                status = AppointmentStatus.IN_SESSION.ToString(),
                verified = true,
                message = "Arrival OTP verified successfully. Clinical session in progress."
            };

            await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveVisitStatusUpdated", payload);
            await _hubContext.Clients.Group($"patient_{appointment.PatientId}").SendAsync("ReceiveVisitStatusUpdated", payload);

            return Ok(payload);
        }

        return BadRequest(new { verified = false, message = "Invalid arrival OTP. Please confirm the 4-digit code shown on the patient's device." });
    }

    [HttpPost("{id}/settle-payment")]
    public async Task<IActionResult> SettlePayment(string id, [FromBody] SettlePaymentDto? dto)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            return NotFound(new { message = $"Appointment with ID '{id}' not found." });
        }

        appointment.PaymentStatus = PaymentStatus.SETTLED;
        if (!string.IsNullOrWhiteSpace(dto?.PaymentMode) && Enum.TryParse<PaymentMode>(dto.PaymentMode, true, out var mode))
        {
            appointment.PaymentMode = mode;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Appointment {AppointmentId} payment settled via {Mode}", appointment.Id, appointment.PaymentMode);

        var payload = new
        {
            appointmentId = appointment.Id,
            paymentStatus = PaymentStatus.SETTLED.ToString(),
            paymentMode = appointment.PaymentMode.ToString(),
            totalFee = appointment.TotalFee,
            settledAt = DateTime.UtcNow
        };

        await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceivePaymentSettled", payload);
        await _hubContext.Clients.Group($"patient_{appointment.PatientId}").SendAsync("ReceivePaymentSettled", payload);
        await _hubContext.Clients.Group($"appointment_{appointment.Id}").SendAsync("ReceivePaymentSettled", payload);

        return Ok(new { success = true, message = "Payment successfully settled.", appointment });
    }

    [HttpPost("{id}/reset-payment")]
    public async Task<IActionResult> ResetPayment(string id)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            return NotFound(new { message = $"Appointment with ID '{id}' not found." });
        }

        appointment.PaymentStatus = PaymentStatus.PENDING;
        await _context.SaveChangesAsync();
        _logger.LogInformation("Appointment {AppointmentId} payment status reset to PENDING", appointment.Id);

        var payload = new
        {
            appointmentId = appointment.Id,
            paymentStatus = PaymentStatus.PENDING.ToString(),
            paymentMode = appointment.PaymentMode.ToString(),
            totalFee = appointment.TotalFee,
            updatedAt = DateTime.UtcNow
        };

        await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceivePaymentReset", payload);
        await _hubContext.Clients.Group($"patient_{appointment.PatientId}").SendAsync("ReceivePaymentReset", payload);
        await _hubContext.Clients.Group($"appointment_{appointment.Id}").SendAsync("ReceivePaymentReset", payload);

        return Ok(new { success = true, message = "Payment status reset to PENDING.", appointment });
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteAppointment(string id, [FromBody] CompleteSessionDto dto)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Request)
            .Include(a => a.Therapist)
                .ThenInclude(t => t!.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            return NotFound(new { message = $"Appointment with ID '{id}' not found." });
        }

        // Gate 1: Payment Check
        if (appointment.PaymentStatus != PaymentStatus.SETTLED && appointment.PaymentStatus != PaymentStatus.AUTHORIZED)
        {
            return BadRequest(new 
            { 
                success = false, 
                requiresPayment = true,
                message = $"Payment of ₹{appointment.TotalFee:F2} is pending. Please collect and settle payment before completing session." 
            });
        }

        // Gate 2: Completion OTP Check (Accepts appointment.CompletionOtp or fixed '8844')
        var submittedOtp = dto.Otp?.Trim();
        bool isOtpValid = string.Equals(appointment.CompletionOtp, submittedOtp, StringComparison.OrdinalIgnoreCase) ||
                          string.Equals("8844", submittedOtp, StringComparison.OrdinalIgnoreCase);

        if (!isOtpValid)
        {
            return BadRequest(new 
            { 
                success = false, 
                requiresOtp = true,
                message = "Invalid Completion OTP. Please ask the patient for their 4-digit discharge verification code." 
            });
        }

        // Complete Session
        appointment.Status = AppointmentStatus.COMPLETED;
        if (!string.IsNullOrWhiteSpace(dto.ClinicalNotes))
        {
            appointment.ClinicalNotes = string.IsNullOrWhiteSpace(appointment.ClinicalNotes)
                ? dto.ClinicalNotes
                : $"{appointment.ClinicalNotes}\n[Discharge {DateTime.UtcNow:HH:mm}] {dto.ClinicalNotes}";
        }

        if (dto.PostTreatmentPainScore.HasValue)
        {
            appointment.ClinicalNotes += $"\n[Post-Treatment VAS Pain Score: {dto.PostTreatmentPainScore.Value}/10]";
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Appointment {AppointmentId} successfully completed with OTP verification", appointment.Id);

        var statusPayload = new 
        {
            appointmentId = appointment.Id,
            status = AppointmentStatus.COMPLETED.ToString(),
            clinicalNotes = appointment.ClinicalNotes,
            paymentStatus = appointment.PaymentStatus.ToString(),
            updatedAt = DateTime.UtcNow,
            completed = true
        };

        await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveVisitStatusUpdated", statusPayload);
        await _hubContext.Clients.Group($"patient_{appointment.PatientId}").SendAsync("ReceiveVisitStatusUpdated", statusPayload);
        await _hubContext.Clients.Group($"appointment_{appointment.Id}").SendAsync("ReceiveVisitStatusUpdated", statusPayload);

        return Ok(new 
        { 
            success = true, 
            message = "Session successfully completed and verified!", 
            appointment 
        });
    }

    [HttpPost("clean-sessions")]
    [HttpDelete("clean-sessions")]
    public async Task<IActionResult> CleanSessionData([FromQuery] bool resetPendingTriage = true, [FromQuery] bool purgeAllRequests = false)
    {
        // 1. Delete all appointments / sessions
        var appointments = await _context.Appointments.ToListAsync();
        _context.Appointments.RemoveRange(appointments);

        // 2. Handle service requests
        var requests = await _context.ServiceRequests.ToListAsync();
        if (purgeAllRequests)
        {
            _context.ServiceRequests.RemoveRange(requests);
        }
        else
        {
            foreach (var req in requests)
            {
                if (req.Id == "req_760123" || req.Id == "req_868096")
                {
                    _context.ServiceRequests.Remove(req);
                }
                else if (resetPendingTriage)
                {
                    req.Status = RequestStatus.PENDING_TRIAGE;
                    req.TotalSessions = 1;
                    req.PackageName = null;
                    req.OfflineConsultationNotes = null;
                }
            }
        }

        // 3. Clean up test users created during automated testing
        var testUsers = await _context.Users
            .Where(u => u.Email == "kavita.rao@test.com" || u.Email == "suresh.patel@test.com")
            .ToListAsync();
        if (testUsers.Any())
        {
            _context.Users.RemoveRange(testUsers);
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Cleaned {Count} session appointments and reset triage status", appointments.Count);

        // Broadcast real-time refresh to dispatch desk
        await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveAppointmentsRefreshed");
        await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveVisitStatusUpdated", new { status = "REFRESH" });

        return Ok(new
        {
            success = true,
            message = "All appointment sessions successfully cleaned. System ready for manual testing.",
            deletedAppointments = appointments.Count,
            resetRequests = requests.Count(r => r.Id != "req_760123" && r.Id != "req_868096")
        });
    }

    private static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371.0; // Earth radius in km
        double dLat = ToRadians(lat2 - lat1);
        double dLon = ToRadians(lon2 - lon1);

        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                   Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return Math.Round(R * c, 1);
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;
}

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
    public async Task<IActionResult> GetAppointments()
    {
        var appointments = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Request)
                .ThenInclude(r => r!.Category)
            .Include(a => a.Therapist)
                .ThenInclude(t => t!.User)
            .OrderByDescending(a => a.CreatedAt)
            .AsNoTracking()
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

        // Calculate approximate distance (Haversine formula in km)
        double distanceKm = CalculateDistanceKm(
            therapist.CurrentLatitude, therapist.CurrentLongitude,
            request.Latitude, request.Longitude
        );

        decimal basePrice = request.Category?.BasePrice ?? 85.00m;
        var fee = _pricingService.CalculateSessionFee(basePrice, distanceKm, request.Urgency);

        var startTime = dto.ScheduledStart ?? DateTime.UtcNow.AddMinutes(30);
        int durationMinutes = request.Category?.EstimatedDurationMinutes ?? 60;
        var endTime = startTime.AddMinutes(durationMinutes);

        // Generate 4-digit arrival OTP
        string arrivalOtp = Random.Shared.Next(1000, 9999).ToString();

        var appointment = new Appointment
        {
            Id = $"apt_{DateTime.UtcNow.Ticks % 1000000}",
            RequestId = request.Id,
            Request = request,
            PatientId = patient.Id,
            Patient = patient,
            TherapistId = therapist.Id,
            Therapist = therapist,
            Status = AppointmentStatus.ASSIGNED,
            ScheduledStart = startTime,
            ScheduledEnd = endTime,
            ArrivalOtp = arrivalOtp,
            BaseFee = fee.BaseFee,
            DistanceTierFee = fee.DistanceTierFee,
            UrgentFee = fee.UrgentFee,
            PlatformFee = fee.PlatformFee,
            Tax = fee.Tax,
            TotalFee = fee.TotalFee,
            PaymentMode = PaymentMode.CARD,
            PaymentStatus = PaymentStatus.AUTHORIZED,
            ClinicalNotes = $"Initial booking: {request.ChiefComplaint}",
            CreatedAt = DateTime.UtcNow
        };

        request.Status = RequestStatus.ASSIGNED;

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Appointment assigned: {AppointmentId} for Request: {RequestId} to PT: {TherapistId}", 
            appointment.Id, request.Id, therapist.Id);

        // Real-Time SignalR Broadcast
        await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveAppointmentAssigned", appointment);
        await _hubContext.Clients.Group($"patient_{patient.Id}").SendAsync("ReceiveAppointmentAssigned", appointment);
        await _hubContext.Clients.Group($"clinician_{therapist.Id}").SendAsync("ReceiveAppointmentAssigned", appointment);

        return Ok(new { success = true, appointment });
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
                message = $"Payment of ${appointment.TotalFee:F2} is pending. Please collect and settle payment before completing session." 
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

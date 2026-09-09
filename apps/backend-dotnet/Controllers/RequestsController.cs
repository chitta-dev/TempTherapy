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
    private readonly IHubContext<TherapyHub> _hubContext;
    private readonly ILogger<RequestsController> _logger;

    public RequestsController(
        TherapyDbContext context, 
        IHubContext<TherapyHub> hubContext,
        ILogger<RequestsController> logger)
    {
        _context = context;
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
            Status = RequestStatus.PENDING_TRIAGE,
            Urgency = urgency,
            CreatedAt = DateTime.UtcNow
        };

        _context.ServiceRequests.Add(newRequest);
        await _context.SaveChangesAsync();

        _logger.LogInformation("New service request created: {RequestId} for patient {PatientId}", newRequest.Id, patient.Id);

        // Real-Time SignalR Broadcast to Dispatch Desk
        await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveNewRequest", newRequest);

        return Ok(new
        {
            success = true,
            message = $"New patient '{patient.FullName}' registered and triage request #{newRequest.Id} created!",
            request = newRequest,
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
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TherapyCare.Api.Data;
using TherapyCare.Api.Dtos;
using TherapyCare.Api.Hubs;
using TherapyCare.Api.Models;

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
    public async Task<IActionResult> GetRequests()
    {
        var requests = await _context.ServiceRequests
            .Include(r => r.Patient)
            .Include(r => r.Category)
            .OrderByDescending(r => r.CreatedAt)
            .AsNoTracking()
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

    [HttpPost]
    public async Task<IActionResult> CreateRequest([FromBody] CreateServiceRequestDto dto)
    {
        User? patient = null;
        if (!string.IsNullOrWhiteSpace(dto.PatientId))
        {
            patient = await _context.Users.FindAsync(dto.PatientId);
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
            TargetArea = string.IsNullOrWhiteSpace(dto.TargetArea) ? "Lower Back" : dto.TargetArea,
            PainSeverity = dto.PainSeverity is >= 1 and <= 10 ? dto.PainSeverity.Value : 5,
            ChiefComplaint = dto.ChiefComplaint ?? string.Empty,
            PreferredDate = string.IsNullOrWhiteSpace(dto.PreferredDate) ? "Today" : dto.PreferredDate,
            PreferredTimeSlot = string.IsNullOrWhiteSpace(dto.PreferredTimeSlot) ? "10:00 AM" : dto.PreferredTimeSlot,
            AddressLine = string.IsNullOrWhiteSpace(dto.AddressLine) ? "742 Evergreen Terrace, Apt 4B, New York, NY" : dto.AddressLine,
            Latitude = dto.Latitude ?? 40.7128,
            Longitude = dto.Longitude ?? -74.0060,
            Status = RequestStatus.PENDING_TRIAGE,
            Urgency = urgency,
            CreatedAt = DateTime.UtcNow
        };

        _context.ServiceRequests.Add(newRequest);
        await _context.SaveChangesAsync();

        _logger.LogInformation("New service request created: {RequestId}", newRequest.Id);

        // Real-Time SignalR Broadcast to Dispatch Desk
        await _hubContext.Clients.Group("dispatch_desk").SendAsync("ReceiveNewRequest", newRequest);

        return CreatedAtAction(nameof(GetRequest), new { id = newRequest.Id }, newRequest);
    }
}

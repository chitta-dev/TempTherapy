using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TherapyCare.Api.Data;

namespace TherapyCare.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TherapistsController : ControllerBase
{
    private readonly TherapyDbContext _context;

    public TherapistsController(TherapyDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTherapists()
    {
        var therapists = await _context.TherapistProfiles
            .Include(t => t.User)
            .AsNoTracking()
            .ToListAsync();

        var response = therapists.Select(t => new
        {
            t.Id,
            t.UserId,
            t.User,
            t.LicenseNumber,
            Specializations = ParseJsonList(t.SpecializationsJson),
            t.ExperienceYears,
            t.Rating,
            t.ReviewCount,
            t.IsAvailable,
            Location = new
            {
                latitude = t.CurrentLatitude,
                longitude = t.CurrentLongitude
            },
            t.ServiceRadiusKm
        });

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTherapist(string id)
    {
        var therapist = await _context.TherapistProfiles
            .Include(t => t.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

        if (therapist == null)
        {
            return NotFound(new { message = $"Therapist with ID '{id}' not found." });
        }

        var response = new
        {
            therapist.Id,
            therapist.UserId,
            therapist.User,
            therapist.LicenseNumber,
            Specializations = ParseJsonList(therapist.SpecializationsJson),
            therapist.ExperienceYears,
            therapist.Rating,
            therapist.ReviewCount,
            therapist.IsAvailable,
            Location = new
            {
                latitude = therapist.CurrentLatitude,
                longitude = therapist.CurrentLongitude
            },
            therapist.ServiceRadiusKm
        };

        return Ok(response);
    }

    private static List<string> ParseJsonList(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }
}

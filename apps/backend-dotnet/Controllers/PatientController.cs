using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TherapyCare.Api.Data;
using TherapyCare.Api.Dtos;
using TherapyCare.Api.Models;

namespace TherapyCare.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PatientController : ControllerBase
{
    private readonly TherapyDbContext _context;

    public PatientController(TherapyDbContext context)
    {
        _context = context;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var patient = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Role == UserRole.Patient);

        if (patient == null)
        {
            return NotFound(new { message = "Patient profile not found." });
        }

        return Ok(patient);
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] PatientProfileDto dto)
    {
        var patient = await _context.Users
            .FirstOrDefaultAsync(u => u.Role == UserRole.Patient);

        if (patient == null)
        {
            return NotFound(new { message = "Patient profile not found." });
        }

        if (!string.IsNullOrWhiteSpace(dto.FullName)) patient.FullName = dto.FullName;
        if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) patient.PhoneNumber = dto.PhoneNumber;
        if (!string.IsNullOrWhiteSpace(dto.Email)) patient.Email = dto.Email;
        if (!string.IsNullOrWhiteSpace(dto.EmergencyContactName)) patient.EmergencyContactName = dto.EmergencyContactName;
        if (!string.IsNullOrWhiteSpace(dto.EmergencyContactPhone)) patient.EmergencyContactPhone = dto.EmergencyContactPhone;
        if (dto.MedicalConditions != null) patient.MedicalConditions = dto.MedicalConditions;
        if (dto.Allergies != null) patient.Allergies = dto.Allergies;
        if (!string.IsNullOrWhiteSpace(dto.BloodGroup)) patient.BloodGroup = dto.BloodGroup;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Clinical patient profile updated successfully.", profile = patient });
    }
}

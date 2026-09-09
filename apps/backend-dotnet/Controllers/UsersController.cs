using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TherapyCare.Api.Data;
using TherapyCare.Api.Models;

namespace TherapyCare.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly TherapyDbContext _context;

    public UsersController(TherapyDbContext context)
    {
        _context = context;
    }

    public record CreateUserDto(
        string FullName,
        string Email,
        string? PhoneNumber,
        string Role,
        string? Password,
        string? LicenseNumber,
        string? SpecializationsJson,
        int? ExperienceYears
    );

    public record UpdateUserDto(
        string FullName,
        string? Email,
        string? PhoneNumber,
        string? Role,
        string? Password
    );

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] string? role)
    {
        var query = _context.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var userRole))
        {
            query = query.Where(u => u.Role == userRole);
        }

        var users = await query.OrderByDescending(u => u.CreatedAt).ToListAsync();
        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(string id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });
        return Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email))
        {
            return BadRequest(new { message = "Full Name and Email are required." });
        }

        var cleanEmail = dto.Email.Trim().ToLower();
        var existing = await _context.Users.AnyAsync(u => u.Email != null && u.Email.ToLower() == cleanEmail);
        if (existing)
        {
            return BadRequest(new { message = $"User with email '{dto.Email}' already exists." });
        }

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
        {
            role = UserRole.Patient;
        }

        var prefix = role switch
        {
            UserRole.Admin => "usr_admin",
            UserRole.Dispatcher => "usr_desk",
            UserRole.Therapist => "usr_pt",
            _ => "usr_patient"
        };

        var user = new User
        {
            Id = $"{prefix}_{DateTime.UtcNow.Ticks % 1000000}",
            FullName = dto.FullName.Trim(),
            Email = cleanEmail,
            PhoneNumber = dto.PhoneNumber?.Trim(),
            Role = role,
            PasswordHash = !string.IsNullOrWhiteSpace(dto.Password) ? dto.Password.Trim() : "password@1234",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);

        // If creating a Therapist, also create TherapistProfile
        if (role == UserRole.Therapist)
        {
            var profile = new TherapistProfile
            {
                Id = $"pt_{DateTime.UtcNow.Ticks % 1000000}",
                UserId = user.Id,
                LicenseNumber = !string.IsNullOrWhiteSpace(dto.LicenseNumber) ? dto.LicenseNumber.Trim() : $"PT-IND-{Random.Shared.Next(10000, 99999)}",
                SpecializationsJson = !string.IsNullOrWhiteSpace(dto.SpecializationsJson) ? dto.SpecializationsJson : "[\"Orthopedic & Musculoskeletal\"]",
                ExperienceYears = dto.ExperienceYears ?? 5,
                Rating = 4.9,
                ReviewCount = 10,
                IsAvailable = true,
                CurrentLatitude = 28.6139,
                CurrentLongitude = 77.2090,
                ServiceRadiusKm = 20.0
            };
            _context.TherapistProfiles.Add(profile);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "User created successfully.", user });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Email)) user.Email = dto.Email.Trim().ToLower();
        if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Password)) user.PasswordHash = dto.Password.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Role) && Enum.TryParse<UserRole>(dto.Role, true, out var role))
        {
            user.Role = role;
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "User updated successfully.", user });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        if (user.Id == "usr_admin")
        {
            return BadRequest(new { message = "The master root admin user cannot be deleted." });
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "User deleted successfully." });
    }
}

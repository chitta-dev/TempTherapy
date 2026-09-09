using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TherapyCare.Api.Data;
using TherapyCare.Api.Models;
using TherapyCare.Api.Services;

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
        string? FullName,
        string? Email,
        string? PhoneNumber,
        string? Role,
        string? MedicalConditions,
        string? BloodGroup,
        string? EmergencyContactName,
        string? EmergencyContactPhone
    );

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] string? role)
    {
        var query = _context.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var userRole))
        {
            query = query.Where(u => u.Role == userRole);
        }

        var users = await query.OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.Role,
                u.FullName,
                u.Email,
                u.PhoneNumber,
                u.EmergencyContactName,
                u.EmergencyContactPhone,
                u.MedicalConditions,
                u.Allergies,
                u.BloodGroup,
                u.IsActivated,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(string id)
    {
        var u = await _context.Users.FindAsync(id);
        if (u == null) return NotFound(new { message = "User not found." });

        return Ok(new
        {
            u.Id,
            u.Role,
            u.FullName,
            u.Email,
            u.PhoneNumber,
            u.EmergencyContactName,
            u.EmergencyContactPhone,
            u.MedicalConditions,
            u.Allergies,
            u.BloodGroup,
            u.IsActivated,
            u.CreatedAt
        });
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

        // Password handling:
        // Patients and Therapists authenticate primarily via Mobile OTP; initial default is "password@1234"
        // Non-Patients / Non-Therapists (Admin, DeskBoy) have password field enabled in UI; defaults to "password@1234" if left blank
        var rawPassword = (role == UserRole.Patient || role == UserRole.Therapist)
            ? "password@1234"
            : (!string.IsNullOrWhiteSpace(dto.Password) ? dto.Password.Trim() : "password@1234");

        // Encrypt password using cryptographic salt and hash
        var hashedPassword = PasswordSecurity.HashPassword(rawPassword);

        var activationToken = Guid.NewGuid().ToString("N");

        var user = new User
        {
            Id = $"{prefix}_{DateTime.UtcNow.Ticks % 1000000}",
            FullName = dto.FullName.Trim(),
            Email = cleanEmail,
            PhoneNumber = dto.PhoneNumber?.Trim(),
            Role = role,
            PasswordHash = hashedPassword,
            ActivationToken = activationToken,
            ActivationTokenExpiresAt = DateTime.UtcNow.AddDays(7),
            IsActivated = false,
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

        var activationLink = $"http://localhost:3000/?action=reset-password&token={user.ActivationToken}&email={Uri.EscapeDataString(user.Email)}";
        var emailNotification = $"[ACTIVATION EMAIL to {user.Email}]: Welcome to TherapyHub, {user.FullName}! Your account has been registered with role {user.Role}. Click this link to set your secure password and activate your account:\n{activationLink}\n(Link is valid for 7 days).";

        var notificationMessage = !string.IsNullOrWhiteSpace(user.PhoneNumber)
            ? $"[SMS Sent to {user.PhoneNumber}]: Welcome to TherapyHub, {user.FullName}! Your account has been registered. Download the mobile app and log in with {user.PhoneNumber} using OTP (1234)."
            : $"[Notification queued]: Welcome to TherapyHub, {user.FullName}!";

        Console.WriteLine($"[EMAIL-DISPATCH] {emailNotification}");
        Console.WriteLine($"[SMS-DISPATCH] {notificationMessage}");

        return Ok(new { 
            success = true, 
            message = $"User {user.FullName} created successfully. Activation email dispatched.", 
            activationLink,
            activationToken,
            emailDispatched = true,
            emailNotification,
            notification = notificationMessage,
            user = new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                Role = user.Role.ToString(),
                user.IsActivated,
                user.CreatedAt
            }
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Email)) user.Email = dto.Email.Trim().ToLower();
        if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber.Trim();
        // NOTE: Password is intentionally NOT updated here. Passwords are non-editable via web application profile update form.
        if (!string.IsNullOrWhiteSpace(dto.MedicalConditions)) user.MedicalConditions = dto.MedicalConditions.Trim();
        if (!string.IsNullOrWhiteSpace(dto.BloodGroup)) user.BloodGroup = dto.BloodGroup.Trim();
        if (!string.IsNullOrWhiteSpace(dto.EmergencyContactName)) user.EmergencyContactName = dto.EmergencyContactName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.EmergencyContactPhone)) user.EmergencyContactPhone = dto.EmergencyContactPhone.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Role) && Enum.TryParse<UserRole>(dto.Role, true, out var role))
        {
            user.Role = role;
        }

        await _context.SaveChangesAsync();
        return Ok(new { 
            success = true, 
            message = "User updated successfully.", 
            user = new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                Role = user.Role.ToString(),
                user.IsActivated,
                user.CreatedAt
            }
        });
    }

    [HttpPost("{id}/resend-activation")]
    public async Task<IActionResult> ResendActivation(string id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });
        if (string.IsNullOrWhiteSpace(user.Email)) return BadRequest(new { message = "User has no email address." });

        user.ActivationToken = Guid.NewGuid().ToString("N");
        user.ActivationTokenExpiresAt = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        var activationLink = $"http://localhost:3000/?action=reset-password&token={user.ActivationToken}&email={Uri.EscapeDataString(user.Email)}";
        var emailNotification = $"[ACTIVATION EMAIL to {user.Email}]: Reset your password at {activationLink}";
        Console.WriteLine($"[EMAIL-DISPATCH] {emailNotification}");

        return Ok(new
        {
            success = true,
            message = $"Activation email dispatched to {user.Email}.",
            activationLink,
            token = user.ActivationToken
        });
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

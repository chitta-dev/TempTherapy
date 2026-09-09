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
        string? Email,
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
        string? EmergencyContactPhone,
        bool? IsActivated
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
        if (string.IsNullOrWhiteSpace(dto.FullName))
        {
            return BadRequest(new { message = "Full Name is required." });
        }

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
        {
            role = UserRole.Patient;
        }

        // Email is mandatory for Therapist, Admin, and Dispatcher. Email is NOT mandatory for Patients!
        string? cleanEmail = null;
        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            cleanEmail = dto.Email.Trim().ToLower();
            var existing = await _context.Users.AnyAsync(u => u.Email != null && u.Email.ToLower() == cleanEmail);
            if (existing)
            {
                return BadRequest(new { message = $"User with email '{dto.Email}' already exists." });
            }
        }
        else if (role != UserRole.Patient)
        {
            return BadRequest(new { message = $"Email address is required for {role} accounts." });
        }

        // Phone number is required for mobile roles (Patient and Therapist)
        if (role == UserRole.Patient || role == UserRole.Therapist)
        {
            if (string.IsNullOrWhiteSpace(dto.PhoneNumber))
            {
                return BadRequest(new { message = $"Mobile phone number is required for {role} accounts." });
            }
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
        var rawPassword = "password@1234";
        if (role == UserRole.Admin || role == UserRole.Dispatcher)
        {
            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                var trimmedPass = dto.Password.Trim();
                if (trimmedPass != "password@1234")
                {
                    var policyResult = PasswordSecurity.ValidatePolicy(trimmedPass);
                    if (!policyResult.IsValid)
                    {
                        return BadRequest(new
                        {
                            message = policyResult.Errors.First(),
                            errors = policyResult.Errors
                        });
                    }
                }
                rawPassword = trimmedPass;
            }
        }

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
            // Patient accounts start as inactive until basic details are provided on first login
            IsActivated = (role != UserRole.Patient),
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
                CurrentLatitude = 12.9716,
                CurrentLongitude = 77.5946,
                ServiceRadiusKm = 20.0
            };
            _context.TherapistProfiles.Add(profile);
        }

        await _context.SaveChangesAsync();

        string? activationLink = null;
        string? welcomeEmail = null;
        string? welcomeSms = null;

        if (role == UserRole.Therapist)
        {
            welcomeEmail = $"Welcome to TherapyHub, {user.FullName}!\n\nYour certified clinician account has been registered by the administrator. You can now login using your mobile number: {user.PhoneNumber} with OTP (1234).\n\nOnce logged in, biometric authentication will be enabled for 30 days.";
            welcomeSms = $"Welcome to TherapyHub, {user.FullName}! Your therapist account is ready. Log in to the mobile app with {user.PhoneNumber} using OTP (1234).";
            Console.WriteLine($"[WELCOME-EMAIL to {user.Email}]: {welcomeEmail}");
            Console.WriteLine($"[SMS-DISPATCH] {welcomeSms}");
        }
        else if (role == UserRole.Patient)
        {
            welcomeSms = $"Welcome to TherapyHub, {user.FullName}! Your patient profile has been registered by the Care Desk. You can now login with your mobile number: {user.PhoneNumber} using OTP (1234). On your first login, please provide your basic details to activate your account.";
            Console.WriteLine($"[WELCOME-SMS to {user.PhoneNumber}]: {welcomeSms}");
        }
        else
        {
            activationLink = $"http://localhost:3000/?action=reset-password&token={user.ActivationToken}&email={Uri.EscapeDataString(user.Email ?? "")}";
            welcomeEmail = $"[ACTIVATION EMAIL to {user.Email}]: Welcome to TherapyHub, {user.FullName}! Your account has been registered with role {user.Role}. Click this link to set your secure password and activate your account:\n{activationLink}\n(Link is valid for 7 days).";
            Console.WriteLine($"[EMAIL-DISPATCH] {welcomeEmail}");
        }

        return Ok(new { 
            success = true, 
            message = role == UserRole.Patient 
                ? $"Patient {user.FullName} registered successfully. Welcome SMS dispatched to {user.PhoneNumber}."
                : role == UserRole.Therapist
                ? $"Therapist {user.FullName} registered successfully. Welcome email dispatched to {user.Email}."
                : $"User {user.FullName} created successfully. Activation email dispatched.", 
            role = user.Role.ToString(),
            welcomeEmail,
            welcomeSms,
            activationLink,
            activationToken,
            emailDispatched = (role != UserRole.Patient),
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
        if (!string.IsNullOrWhiteSpace(dto.MedicalConditions)) user.MedicalConditions = dto.MedicalConditions.Trim();
        if (!string.IsNullOrWhiteSpace(dto.BloodGroup)) user.BloodGroup = dto.BloodGroup.Trim();
        if (!string.IsNullOrWhiteSpace(dto.EmergencyContactName)) user.EmergencyContactName = dto.EmergencyContactName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.EmergencyContactPhone)) user.EmergencyContactPhone = dto.EmergencyContactPhone.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Role) && Enum.TryParse<UserRole>(dto.Role, true, out var role))
        {
            user.Role = role;
        }

        if (dto.IsActivated.HasValue)
        {
            user.IsActivated = dto.IsActivated.Value;
        }
        else if (user.Role == UserRole.Patient && !string.IsNullOrWhiteSpace(user.FullName) && !string.IsNullOrWhiteSpace(user.EmergencyContactName))
        {
            // Patient provided mandatory basic details -> activate profile!
            user.IsActivated = true;
        }

        await _context.SaveChangesAsync();
        return Ok(new { 
            success = true, 
            message = "User profile updated successfully.", 
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

        if (user.Role == UserRole.Therapist)
        {
            var welcomeEmail = $"Welcome to TherapyHub, {user.FullName}!\n\nYour clinician account has been registered by the administrator. You can now login using your mobile number: {user.PhoneNumber} with OTP (1234).\n\nOnce logged in, biometric authentication will be enabled for 30 days.";
            Console.WriteLine($"[RESEND WELCOME-EMAIL to {user.Email}]: {welcomeEmail}");
            return Ok(new
            {
                success = true,
                message = $"Welcome email sent to {user.Email} with mobile login instructions.",
                role = "Therapist",
                welcomeEmail
            });
        }
        else if (user.Role == UserRole.Patient)
        {
            var welcomeSms = $"Welcome to TherapyHub, {user.FullName}! Your patient profile has been registered by the Care Desk. You can now login with your mobile number: {user.PhoneNumber} using OTP (1234). On your first login, please provide your basic details to activate your account.";
            Console.WriteLine($"[RESEND WELCOME-SMS to {user.PhoneNumber}]: {welcomeSms}");
            return Ok(new
            {
                success = true,
                message = $"Welcome SMS dispatched to {user.PhoneNumber}.",
                role = "Patient",
                welcomeSms
            });
        }
        else
        {
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
                role = user.Role.ToString(),
                activationLink,
                token = user.ActivationToken,
                emailNotification
            });
        }
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

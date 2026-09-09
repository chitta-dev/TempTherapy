using System.ComponentModel.DataAnnotations;

namespace TherapyCare.Api.Models;

public class User
{
    [Key]
    public string Id { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Patient;

    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? Email { get; set; }

    [MaxLength(30)]
    public string? PhoneNumber { get; set; }

    // Personal & Clinical Profile Information
    [MaxLength(150)]
    public string? EmergencyContactName { get; set; }

    [MaxLength(30)]
    public string? EmergencyContactPhone { get; set; }

    [MaxLength(200)]
    public string? MedicalConditions { get; set; }

    [MaxLength(200)]
    public string? Allergies { get; set; }

    [MaxLength(10)]
    public string? BloodGroup { get; set; } = "O+";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

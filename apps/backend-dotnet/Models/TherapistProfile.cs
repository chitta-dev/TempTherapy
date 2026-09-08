using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TherapyCare.Api.Models;

public class TherapistProfile
{
    [Key]
    public string Id { get; set; } = string.Empty;

    [Required]
    public string UserId { get; set; } = string.Empty;

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [MaxLength(50)]
    public string LicenseNumber { get; set; } = string.Empty;

    public string SpecializationsJson { get; set; } = "[]";

    public int ExperienceYears { get; set; } = 5;

    public double Rating { get; set; } = 4.9;

    public int ReviewCount { get; set; } = 35;

    public bool IsAvailable { get; set; } = true;

    public double CurrentLatitude { get; set; } = 40.7128;

    public double CurrentLongitude { get; set; } = -74.0060;

    public double ServiceRadiusKm { get; set; } = 15.0;
}

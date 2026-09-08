using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TherapyCare.Api.Models;

public class ServiceRequest
{
    [Key]
    public string Id { get; set; } = string.Empty;

    [Required]
    public string PatientId { get; set; } = string.Empty;

    [ForeignKey(nameof(PatientId))]
    public User? Patient { get; set; }

    [Required]
    public string CategoryId { get; set; } = string.Empty;

    [ForeignKey(nameof(CategoryId))]
    public TherapyCategory? Category { get; set; }

    [MaxLength(100)]
    public string TargetArea { get; set; } = "Lower Back";

    public int PainSeverity { get; set; } = 5;

    [MaxLength(500)]
    public string ChiefComplaint { get; set; } = string.Empty;

    [MaxLength(30)]
    public string PreferredDate { get; set; } = string.Empty;

    [MaxLength(30)]
    public string PreferredTimeSlot { get; set; } = "10:00 AM";

    [MaxLength(250)]
    public string AddressLine { get; set; } = string.Empty;

    public double Latitude { get; set; } = 40.7128;

    public double Longitude { get; set; } = -74.0060;

    public RequestStatus Status { get; set; } = RequestStatus.PENDING_TRIAGE;

    public UrgencyLevel Urgency { get; set; } = UrgencyLevel.ROUTINE;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TherapyCare.Api.Models;

public class Appointment
{
    [Key]
    public string Id { get; set; } = string.Empty;

    [Required]
    public string RequestId { get; set; } = string.Empty;

    [ForeignKey(nameof(RequestId))]
    public ServiceRequest? Request { get; set; }

    [Required]
    public string PatientId { get; set; } = string.Empty;

    [ForeignKey(nameof(PatientId))]
    public User? Patient { get; set; }

    [Required]
    public string TherapistId { get; set; } = string.Empty;

    [ForeignKey(nameof(TherapistId))]
    public TherapistProfile? Therapist { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.ASSIGNED;

    public DateTime ScheduledStart { get; set; }

    public DateTime ScheduledEnd { get; set; }

    [MaxLength(10)]
    public string ArrivalOtp { get; set; } = "4829";

    [MaxLength(10)]
    public string CompletionOtp { get; set; } = "8844";

    // Itemized Financial Fee Breakdown
    public decimal BaseFee { get; set; }
    public decimal DistanceTierFee { get; set; }
    public decimal UrgentFee { get; set; }
    public decimal PlatformFee { get; set; }
    public decimal Tax { get; set; }
    public decimal TotalFee { get; set; }

    public PaymentMode PaymentMode { get; set; } = PaymentMode.CARD;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.PENDING;

    [MaxLength(1000)]
    public string? ClinicalNotes { get; set; }

    // Multi-Session Care Plan Tracking
    public int SessionIndex { get; set; } = 1;
    public int TotalSessions { get; set; } = 1;

    [MaxLength(150)]
    public string? PackageName { get; set; }

    [MaxLength(1000)]
    public string? OfflineConsultationNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

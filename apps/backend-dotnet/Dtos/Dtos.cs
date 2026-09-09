using TherapyCare.Api.Models;

namespace TherapyCare.Api.Dtos;

public record CreateServiceRequestDto(
    string? PatientId,
    string? CategoryId,
    string? TargetArea,
    int? PainSeverity,
    string? ChiefComplaint,
    string? PreferredDate,
    string? PreferredTimeSlot,
    string? AddressLine,
    double? Latitude,
    double? Longitude,
    string? Urgency,
    string? PatientName = null,
    string? PatientPhone = null,
    string? PatientEmail = null
);

public record AssignAppointmentDto(
    string RequestId,
    string TherapistId,
    DateTime? ScheduledStart,
    string? PaymentMode
);

public record UpdateVisitStatusDto(
    string Status,
    string? ClinicalNotes,
    double? Latitude,
    double? Longitude
);

public record VerifyOtpDto(
    string Otp
);

public record SettlePaymentDto(
    string? PaymentMode,
    decimal? AmountPaid
);

public record CompleteSessionDto(
    string Otp,
    string? ClinicalNotes,
    int? PostTreatmentPainScore
);

public record PatientProfileDto(
    string FullName,
    string PhoneNumber,
    string Email,
    string EmergencyContactName,
    string EmergencyContactPhone,
    string MedicalConditions,
    string Allergies,
    string BloodGroup
);

public record ClinicianLocationDto(
    string AppointmentId,
    string TherapistId,
    double Latitude,
    double Longitude,
    DateTime Timestamp
);

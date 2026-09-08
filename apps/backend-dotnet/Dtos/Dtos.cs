using TherapyCare.Api.Models;

namespace TherapyCare.Api.Dtos;

public record CreateServiceRequestDto(
    string? CategoryId,
    string? TargetArea,
    int? PainSeverity,
    string? ChiefComplaint,
    string? PreferredDate,
    string? PreferredTimeSlot,
    string? AddressLine,
    double? Latitude,
    double? Longitude,
    string? Urgency
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

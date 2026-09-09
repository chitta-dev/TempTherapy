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
    string? PatientEmail = null,
    string? TherapistId = null,
    DateTime? ScheduledStart = null,
    string? PaymentMode = null,
    int? TotalSessions = null,
    string? Frequency = null,
    string? OfflineConsultationNotes = null,
    string? PackageName = null,
    List<DateTime>? CustomSessionDates = null
);

public record AssignAppointmentDto(
    string RequestId,
    string TherapistId,
    DateTime? ScheduledStart,
    string? PaymentMode,
    int? TotalSessions = null,
    string? Frequency = null,
    string? OfflineConsultationNotes = null,
    string? PackageName = null,
    List<DateTime>? CustomSessionDates = null
);

public record BatchScheduleDto(
    string RequestId,
    string TherapistId,
    int TotalSessions,
    string? Frequency,
    DateTime? ScheduledStart,
    string? PaymentMode,
    string? OfflineConsultationNotes,
    string? PackageName,
    List<DateTime>? CustomSessionDates = null
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

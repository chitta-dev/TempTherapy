using System.Text.Json.Serialization;

namespace TherapyCare.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UserRole
{
    Patient,
    Therapist,
    Dispatcher,
    Admin
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RequestStatus
{
    PENDING_TRIAGE,
    ASSIGNED,
    CANCELLED
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UrgencyLevel
{
    ROUTINE,
    URGENT,
    SAME_DAY
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AppointmentStatus
{
    REQUESTED,
    ASSIGNED,
    EN_ROUTE,
    ARRIVED,
    IN_SESSION,
    COMPLETED,
    CANCELLED
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PaymentMode
{
    CARD,
    UPI,
    INSURANCE_COPAY,
    CASH
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PaymentStatus
{
    PENDING,
    AUTHORIZED,
    SETTLED,
    FAILED
}

using Microsoft.AspNetCore.SignalR;
using TherapyCare.Api.Dtos;

namespace TherapyCare.Api.Hubs;

public class TherapyHub : Hub
{
    private readonly ILogger<TherapyHub> _logger;

    public TherapyHub(ILogger<TherapyHub> logger)
    {
        _logger = logger;
    }

    public async Task JoinDispatchDesk()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "dispatch_desk");
        _logger.LogInformation("Connection {ConnectionId} joined dispatch_desk", Context.ConnectionId);
    }

    public async Task JoinPatientChannel(string patientId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"patient_{patientId}");
        _logger.LogInformation("Connection {ConnectionId} joined patient_{PatientId}", Context.ConnectionId, patientId);
    }

    public async Task JoinAppointment(string appointmentId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"appointment_{appointmentId}");
        _logger.LogInformation("Connection {ConnectionId} joined appointment_{AppointmentId}", Context.ConnectionId, appointmentId);
    }

    public async Task BroadcastLocation(string appointmentId, string therapistId, double latitude, double longitude)
    {
        var payload = new ClinicianLocationDto(
            AppointmentId: appointmentId,
            TherapistId: therapistId,
            Latitude: latitude,
            Longitude: longitude,
            Timestamp: DateTime.UtcNow
        );

        // Send to appointment participants and dispatch desk in real-time
        await Clients.Group($"appointment_{appointmentId}").SendAsync("ReceiveClinicianLocation", payload);
        await Clients.Group("dispatch_desk").SendAsync("ReceiveClinicianLocation", payload);
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}

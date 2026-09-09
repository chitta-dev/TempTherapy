using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using TherapyCare.Api.Data;
using TherapyCare.Api.Hubs;
using TherapyCare.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure EF Core (Supabase PostgreSQL or Local SQLite)
var connString = builder.Configuration.GetConnectionString("SupabaseConnection")
    ?? builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=therapy.db";

var isPostgreSql = (connString.Contains("Host=", StringComparison.OrdinalIgnoreCase) || 
                    connString.Contains("User Id=", StringComparison.OrdinalIgnoreCase) ||
                    connString.Contains("Username=", StringComparison.OrdinalIgnoreCase))
                   && !connString.Contains("[YOUR_DB_PASSWORD]");

if (isPostgreSql)
{
    builder.Services.AddDbContext<TherapyDbContext>(options =>
        options.UseNpgsql(connString)
               .UseSnakeCaseNamingConvention());
}
else
{
    var fallbackConn = connString.Contains("[YOUR_DB_PASSWORD]") ? "Data Source=therapy.db" : connString;
    builder.Services.AddDbContext<TherapyDbContext>(options =>
        options.UseSqlite(fallbackConn));
}

// 2. Register Business Services
builder.Services.AddSingleton<PricingService>();

// 3. Configure Controllers & JSON Serializer
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// 4. Configure Real-Time SignalR
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
});

// 5. Configure Permissive CORS for Web Admin, Expo Go & Mobile Simulator
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// 6. Configure Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TherapyCare On-Demand Clinical Platform API",
        Version = "v1",
        Description = "Enterprise .NET Core Backend providing on-demand physiotherapy triage, dispatch orchestration, itemized fee calculation, and real-time SignalR telemetry."
    });
});

var app = builder.Build();

// 7. Seed Initial Clinical Database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TherapyDbContext>();
    DbInitializer.Initialize(db);
}

// 8. Configure HTTP Middleware Pipeline
app.UseCors("AllowAll");

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "TherapyCare API v1");
    c.RoutePrefix = "swagger";
});

// 9. Root Landing Page with System Dashboard
app.MapGet("/", () => Results.Content(@"
    <!DOCTYPE html>
    <html lang=""en"">
      <head>
        <meta charset=""UTF-8"">
        <title>TherapyCare .NET Core API & Real-Time SignalR Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #042f2e; color: #f0fdfa; padding: 40px; margin: 0; }
          .card { background: #134e4a; border-radius: 16px; padding: 32px; max-width: 680px; margin: 0 auto; border: 1px solid #14b8a6; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          h1 { color: #5eead4; margin-top: 0; font-size: 24px; }
          .badge { background: #0d9488; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
          .signalr-badge { background: #059669; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
          a { color: #2dd4bf; text-decoration: none; font-weight: 600; }
          a:hover { text-decoration: underline; color: #99f6e4; }
          ul { line-height: 2; padding-left: 20px; }
          .status-bar { display: flex; gap: 8px; margin: 16px 0; }
          .links-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
          .link-box { background: #115e59; padding: 12px 16px; border-radius: 10px; border: 1px solid #0f766e; }
        </style>
      </head>
      <body>
        <div class=""card"">
          <h1>🩺 TherapyCare .NET 8 Core Backend</h1>
          <div class=""status-bar"">
            <span class=""badge"">ASP.NET CORE 8.0</span>
            <span class=""signalr-badge"">⚡ SIGNALR REAL-TIME ACTIVE</span>
            <span class=""badge"">PORT: 4000</span>
          </div>
          <p>The enterprise .NET Core backend is serving live clinical on-demand triage, dynamic dispatch pricing, and real-time WebSockets telemetry.</p>
          
          <h3>Explore Live Endpoints:</h3>
          <div class=""links-grid"">
            <div class=""link-box"">📖 <a href=""/swagger"" target=""_blank"">OpenAPI Swagger UI</a></div>
            <div class=""link-box"">⚡ <a href=""/hubs/therapy"" target=""_blank"">SignalR Real-Time Hub</a></div>
            <div class=""link-box"">📋 <a href=""/api/categories"" target=""_blank"">Therapy Categories</a></div>
            <div class=""link-box"">📥 <a href=""/api/requests"" target=""_blank"">Triage Requests Queue</a></div>
            <div class=""link-box"">👨‍⚕️ <a href=""/api/therapists"" target=""_blank"">Clinician Roster</a></div>
            <div class=""link-box"">📅 <a href=""/api/appointments"" target=""_blank"">Active Dispatches</a></div>
            <div class=""link-box"">👤 <a href=""/api/patient/profile"" target=""_blank"">Patient Clinical Profile</a></div>
            <div class=""link-box"">🖥️ <a href=""http://localhost:3000"" target=""_blank"">Web Admin Dashboard</a></div>
          </div>
        </div>
      </body>
    </html>
", "text/html"));

// 10. Map Controllers & Real-Time SignalR Hub
app.MapControllers();
app.MapHub<TherapyHub>("/hubs/therapy");

app.Run();

using TherapyCare.Api.Models;
using TherapyCare.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace TherapyCare.Api.Data;

public static class DbInitializer
{
    public static void Initialize(TherapyDbContext context)
    {
        context.Database.EnsureCreated();

        // 1. Ensure table schema has activation columns in Postgres or SQLite
        try
        {
            var isPostgres = context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) ?? false;
            if (isPostgres)
            {
                context.Database.ExecuteSqlRaw(@"
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token VARCHAR(100);
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token_expires_at TIMESTAMP WITH TIME ZONE;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT FALSE;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_passwords_json TEXT;
                ");
            }
            else
            {
                try { context.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN activation_token TEXT;"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN activation_token_expires_at TEXT;"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN is_activated INTEGER DEFAULT 0;"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN previous_passwords_json TEXT;"); } catch { }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DB-MIGRATION] Migration note: {ex.Message}");
        }

        if (context.Categories.Any())
        {
            var admin = context.Users.Find("usr_admin");
            if (admin == null)
            {
                admin = new User
                {
                    Id = "usr_admin",
                    Role = UserRole.Admin,
                    FullName = "Dr. Arthur Mitchell (Root Admin)",
                    Email = "admin@therapyhub.health",
                    PhoneNumber = "+91 98765 43210",
                    PasswordHash = PasswordSecurity.HashPassword("password@1234"),
                    IsActivated = true,
                    CreatedAt = DateTime.UtcNow
                };
                context.Users.Add(admin);
            }
            else
            {
                if (admin.Email != "admin@therapyhub.health")
                {
                    admin.Email = "admin@therapyhub.health";
                }
                if (!PasswordSecurity.IsSaltAndHashed(admin.PasswordHash))
                {
                    admin.PasswordHash = PasswordSecurity.HashPassword("password@1234");
                }
            }

            // Ensure DeskBoy user exists
            var desk = context.Users.FirstOrDefault(u => u.Email == "desk.alex@therapyhub.health");
            if (desk == null)
            {
                desk = new User
                {
                    Id = "usr_desk_alex",
                    Role = UserRole.Dispatcher,
                    FullName = "Alex Morgan (Front-Desk)",
                    Email = "desk.alex@therapyhub.health",
                    PhoneNumber = "+91 98765 11223",
                    PasswordHash = PasswordSecurity.HashPassword("password@1234"),
                    IsActivated = true,
                    CreatedAt = DateTime.UtcNow
                };
                context.Users.Add(desk);
            }

            var jenkins = context.Users.FirstOrDefault(u => u.Role == UserRole.Therapist);
            if (jenkins == null)
            {
                jenkins = new User
                {
                    Id = "usr_pt_jenkins",
                    Role = UserRole.Therapist,
                    FullName = "Dr. Sarah Jenkins, PT, DPT",
                    Email = "sarah.jenkins@therapyhub.health",
                    PhoneNumber = "+91 98765 00001",
                    PasswordHash = "password@1234",
                    BloodGroup = "A+",
                    CreatedAt = DateTime.UtcNow
                };
                context.Users.Add(jenkins);

                if (!context.TherapistProfiles.Any(t => t.UserId == jenkins.Id))
                {
                    context.TherapistProfiles.Add(new TherapistProfile
                    {
                        Id = "pt_jenkins_1",
                        UserId = jenkins.Id,
                        LicenseNumber = "KA-PT-048291",
                        SpecializationsJson = "[\"Orthopedic & Musculoskeletal\", \"Sports Injury & Return-to-Play\", \"Post-Surgical Rehabilitation\"]",
                        ExperienceYears = 8,
                        Rating = 4.9,
                        ReviewCount = 128,
                        IsAvailable = true,
                        CurrentLatitude = 12.9716,
                        CurrentLongitude = 77.5946,
                        ServiceRadiusKm = 15.0
                    });
                }
            }
            else if (string.IsNullOrWhiteSpace(jenkins.PhoneNumber) || jenkins.PhoneNumber.StartsWith("+1"))
            {
                jenkins.PhoneNumber = "+91 98765 00001";
            }

            // Ensure Dr. Marcus Vance also exists as a certified clinician
            var vance = context.Users.FirstOrDefault(u => u.Id == "usr_pt_vance");
            if (vance == null)
            {
                vance = new User
                {
                    Id = "usr_pt_vance",
                    Role = UserRole.Therapist,
                    FullName = "Dr. Marcus Vance, PT, MS",
                    Email = "marcus.vance@therapyhub.health",
                    PhoneNumber = "+91 98765 00002",
                    PasswordHash = "password@1234",
                    BloodGroup = "B+",
                    CreatedAt = DateTime.UtcNow
                };
                context.Users.Add(vance);

                if (!context.TherapistProfiles.Any(t => t.UserId == vance.Id))
                {
                    context.TherapistProfiles.Add(new TherapistProfile
                    {
                        Id = "pt_vance_2",
                        UserId = vance.Id,
                        LicenseNumber = "KA-PT-051184",
                        SpecializationsJson = "[\"Neurological Rehabilitation\", \"Geriatric & Mobility Care\", \"Cardiopulmonary Conditioning\"]",
                        ExperienceYears = 11,
                        Rating = 4.8,
                        ReviewCount = 94,
                        IsAvailable = true,
                        CurrentLatitude = 12.9750,
                        CurrentLongitude = 77.6050,
                        ServiceRadiusKm = 20.0
                    });
                }
            }
            else if (string.IsNullOrWhiteSpace(vance.PhoneNumber) || vance.PhoneNumber.StartsWith("+1"))
            {
                vance.PhoneNumber = "+91 98765 00002";
            }

            context.SaveChanges();
            return; // DB has already been seeded
        }

        var categories = new List<TherapyCategory>
        {
            new() { Id = "cat_ortho", Name = "Orthopedic & Musculoskeletal", Description = "Targeted care for joints, spine, ligaments, and acute muscle injuries.", BasePrice = 85.00m, EstimatedDurationMinutes = 60, IconName = "Bone" },
            new() { Id = "cat_neuro", Name = "Neurological Rehabilitation", Description = "Specialized rehabilitation for stroke, Parkinson's, MS, and spinal cord injuries.", BasePrice = 105.00m, EstimatedDurationMinutes = 75, IconName = "Brain" },
            new() { Id = "cat_geriatric", Name = "Geriatric & Mobility Care", Description = "Fall prevention, safe transfers, arthritis support, and functional independence.", BasePrice = 80.00m, EstimatedDurationMinutes = 60, IconName = "Activity" },
            new() { Id = "cat_sports", Name = "Sports Injury & Return-to-Play", Description = "ACL, rotator cuff, sprains, kinetic chain balance, and performance return.", BasePrice = 95.00m, EstimatedDurationMinutes = 60, IconName = "Zap" },
            new() { Id = "cat_post_op", Name = "Post-Surgical Rehabilitation", Description = "Care protocols for knee/hip replacements, spinal fusions, and tendon repairs.", BasePrice = 100.00m, EstimatedDurationMinutes = 60, IconName = "Scissors" },
            new() { Id = "cat_pediatric", Name = "Pediatric Physical Therapy", Description = "Milestone achievement, torticollis, cerebral palsy, and juvenile gait training.", BasePrice = 110.00m, EstimatedDurationMinutes = 60, IconName = "Baby" },
            new() { Id = "cat_cardiopulmonary", Name = "Cardiopulmonary Conditioning", Description = "Breathing re-education, endurance rebuild, and post-cardiac recovery.", BasePrice = 90.00m, EstimatedDurationMinutes = 60, IconName = "HeartPulse" }
        };
        context.Categories.AddRange(categories);
        context.SaveChanges();

        // Seed Users
        var patient = new User
        {
            Id = "usr_patient_1",
            Role = UserRole.Patient,
            FullName = "Michael Chen",
            Email = "michael.chen@example.com",
            PhoneNumber = "+1 (555) 234-5678",
            EmergencyContactName = "Emily Chen (Spouse)",
            EmergencyContactPhone = "+1 (555) 987-6543",
            MedicalConditions = "Hypertension (Controlled)",
            Allergies = "Penicillin, NSAIDs",
            BloodGroup = "O+",
            CreatedAt = DateTime.UtcNow
        };

        var ptUser1 = new User
        {
            Id = "usr_pt_jenkins",
            Role = UserRole.Therapist,
            FullName = "Dr. Sarah Jenkins, PT, DPT",
            Email = "s.jenkins@therapycare.health",
            PhoneNumber = "+1 (555) 345-6789",
            EmergencyContactName = "Clinic Operations",
            EmergencyContactPhone = "+1 (555) 800-0199",
            BloodGroup = "A+",
            CreatedAt = DateTime.UtcNow
        };

        var ptUser2 = new User
        {
            Id = "usr_pt_vance",
            Role = UserRole.Therapist,
            FullName = "Dr. Marcus Vance, PT, MS",
            Email = "m.vance@therapycare.health",
            PhoneNumber = "+1 (555) 456-7890",
            EmergencyContactName = "Clinic Operations",
            EmergencyContactPhone = "+1 (555) 800-0199",
            BloodGroup = "B+",
            CreatedAt = DateTime.UtcNow
        };

        var ptUser3 = new User
        {
            Id = "usr_pt_rostova",
            Role = UserRole.Therapist,
            FullName = "Dr. Elena Rostova, DPT, OCS",
            Email = "e.rostova@therapycare.health",
            PhoneNumber = "+1 (555) 567-8901",
            EmergencyContactName = "Clinic Operations",
            EmergencyContactPhone = "+1 (555) 800-0199",
            BloodGroup = "O-",
            CreatedAt = DateTime.UtcNow
        };

        context.Users.AddRange(patient, ptUser1, ptUser2, ptUser3);
        context.SaveChanges();

        // Seed Therapist Profiles
        var therapist1 = new TherapistProfile
        {
            Id = "pt_1",
            UserId = ptUser1.Id,
            LicenseNumber = "NY-PT-048291",
            SpecializationsJson = "[\"Orthopedic & Musculoskeletal\", \"Sports Injury & Return-to-Play\", \"Post-Surgical Rehabilitation\"]",
            ExperienceYears = 8,
            Rating = 4.9,
            ReviewCount = 128,
            IsAvailable = true,
            CurrentLatitude = 40.7135,
            CurrentLongitude = -74.0040,
            ServiceRadiusKm = 15.0
        };

        var therapist2 = new TherapistProfile
        {
            Id = "pt_2",
            UserId = ptUser2.Id,
            LicenseNumber = "NY-PT-051184",
            SpecializationsJson = "[\"Neurological Rehabilitation\", \"Geriatric & Mobility Care\", \"Cardiopulmonary Conditioning\"]",
            ExperienceYears = 11,
            Rating = 4.8,
            ReviewCount = 94,
            IsAvailable = true,
            CurrentLatitude = 40.7250,
            CurrentLongitude = -73.9960,
            ServiceRadiusKm = 20.0
        };

        var therapist3 = new TherapistProfile
        {
            Id = "pt_3",
            UserId = ptUser3.Id,
            LicenseNumber = "NY-PT-039920",
            SpecializationsJson = "[\"Post-Surgical Rehabilitation\", \"Pediatric Physical Therapy\", \"Orthopedic & Musculoskeletal\"]",
            ExperienceYears = 6,
            Rating = 5.0,
            ReviewCount = 67,
            IsAvailable = true,
            CurrentLatitude = 40.7380,
            CurrentLongitude = -73.9850,
            ServiceRadiusKm = 12.0
        };

        context.TherapistProfiles.AddRange(therapist1, therapist2, therapist3);
        context.SaveChanges();

        // Seed Initial Service Requests
        var request1 = new ServiceRequest
        {
            Id = "req_101",
            PatientId = patient.Id,
            CategoryId = "cat_ortho",
            TargetArea = "Lower Back",
            PainSeverity = 7,
            ChiefComplaint = "Acute lumbar spasm after lifting heavy box. Radiating ache into left glute. Difficulty sitting longer than 15 mins.",
            PreferredDate = "Today, Oct 12",
            PreferredTimeSlot = "10:00 AM",
            AddressLine = "742 Evergreen Terrace, Apt 4B, New York, NY 10001",
            Latitude = 40.7128,
            Longitude = -74.0060,
            Status = RequestStatus.PENDING_TRIAGE,
            Urgency = UrgencyLevel.SAME_DAY,
            CreatedAt = DateTime.UtcNow.AddMinutes(-45)
        };

        var request2 = new ServiceRequest
        {
            Id = "req_102",
            PatientId = patient.Id,
            CategoryId = "cat_post_op",
            TargetArea = "Right Knee",
            PainSeverity = 5,
            ChiefComplaint = "Day 14 post-operative right total knee arthroplasty (TKA). Needs gentle passive ROM, patellar mobilization, and gait refinement.",
            PreferredDate = "Tomorrow, Oct 13",
            PreferredTimeSlot = "02:30 PM",
            AddressLine = "350 5th Avenue, Suite 1200, New York, NY 10118",
            Latitude = 40.7484,
            Longitude = -73.9857,
            Status = RequestStatus.PENDING_TRIAGE,
            Urgency = UrgencyLevel.ROUTINE,
            CreatedAt = DateTime.UtcNow.AddMinutes(-120)
        };

        context.ServiceRequests.AddRange(request1, request2);
        context.SaveChanges();
    }
}

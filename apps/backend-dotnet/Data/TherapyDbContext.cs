using Microsoft.EntityFrameworkCore;
using TherapyCare.Api.Models;

namespace TherapyCare.Api.Data;

public class TherapyDbContext : DbContext
{
    public TherapyDbContext(DbContextOptions<TherapyDbContext> options) : base(options)
    {
    }

    public DbSet<TherapyCategory> Categories => Set<TherapyCategory>();
    public DbSet<User> Users => Set<User>();
    public DbSet<TherapistProfile> TherapistProfiles => Set<TherapistProfile>();
    public DbSet<ServiceRequest> ServiceRequests => Set<ServiceRequest>();
    public DbSet<Appointment> Appointments => Set<Appointment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<TherapyCategory>(entity =>
        {
            entity.Property(e => e.BasePrice).HasPrecision(18, 2);
        });

        modelBuilder.Entity<TherapistProfile>(entity =>
        {
            entity.Property(e => e.SpecializationsJson).HasColumnName("specializations").HasColumnType("jsonb");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.Role).HasConversion<string>();
        });

        modelBuilder.Entity<ServiceRequest>(entity =>
        {
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.Urgency).HasConversion<string>();
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.PaymentMode).HasConversion<string>();
            entity.Property(e => e.PaymentStatus).HasConversion<string>();
            entity.Property(e => e.BaseFee).HasPrecision(18, 2);
            entity.Property(e => e.DistanceTierFee).HasPrecision(18, 2);
            entity.Property(e => e.UrgentFee).HasPrecision(18, 2);
            entity.Property(e => e.PlatformFee).HasPrecision(18, 2);
            entity.Property(e => e.Tax).HasPrecision(18, 2);
            entity.Property(e => e.TotalFee).HasPrecision(18, 2);
        });
    }
}

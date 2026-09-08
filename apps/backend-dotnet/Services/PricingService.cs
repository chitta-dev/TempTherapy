using TherapyCare.Api.Models;

namespace TherapyCare.Api.Services;

public record FeeBreakdown(
    decimal BaseFee,
    decimal DistanceTierFee,
    decimal UrgentFee,
    decimal PlatformFee,
    decimal Tax,
    decimal TotalFee
);

public class PricingService
{
    private const decimal TaxRate = 0.08875m; // 8.875% NY Combined Sales Tax
    private const decimal PlatformFeeAmount = 10.00m;

    public FeeBreakdown CalculateSessionFee(decimal basePrice, double distanceKm, UrgencyLevel urgency)
    {
        // Distance Tier Calculation
        decimal distanceFee = distanceKm switch
        {
            <= 5.0 => 0.00m,
            <= 10.0 => 12.00m,
            <= 20.0 => 24.00m,
            _ => 38.00m
        };

        // Urgency Surcharge
        decimal urgentFee = urgency switch
        {
            UrgencyLevel.SAME_DAY => 20.00m,
            UrgencyLevel.URGENT => 35.00m,
            _ => 0.00m
        };

        decimal subtotal = basePrice + distanceFee + urgentFee + PlatformFeeAmount;
        decimal tax = Math.Round(subtotal * TaxRate, 2);
        decimal total = subtotal + tax;

        return new FeeBreakdown(
            BaseFee: basePrice,
            DistanceTierFee: distanceFee,
            UrgentFee: urgentFee,
            PlatformFee: PlatformFeeAmount,
            Tax: tax,
            TotalFee: total
        );
    }
}

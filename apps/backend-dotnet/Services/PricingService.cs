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
    private const decimal TaxRate = 0.05m; // 5% Healthcare GST
    private const decimal PlatformFeeAmount = 99.00m; // INR 99 Platform & Clinical Consumables

    public FeeBreakdown CalculateSessionFee(decimal basePrice, double distanceKm, UrgencyLevel urgency)
    {
        // Distance Tier Calculation in Rupees
        decimal distanceFee = distanceKm switch
        {
            <= 5.0 => 0.00m,
            <= 10.0 => 100.00m,
            <= 20.0 => 250.00m,
            _ => 400.00m
        };

        // Urgency Surcharge in Rupees
        decimal urgentFee = urgency switch
        {
            UrgencyLevel.SAME_DAY => 150.00m,
            UrgencyLevel.URGENT => 300.00m,
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

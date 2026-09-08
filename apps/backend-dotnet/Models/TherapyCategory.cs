using System.ComponentModel.DataAnnotations;

namespace TherapyCare.Api.Models;

public class TherapyCategory
{
    [Key]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public decimal BasePrice { get; set; }

    public int EstimatedDurationMinutes { get; set; }

    [MaxLength(50)]
    public string IconName { get; set; } = string.Empty;
}

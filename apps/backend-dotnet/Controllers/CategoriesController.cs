using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TherapyCare.Api.Data;
using TherapyCare.Api.Models;

namespace TherapyCare.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly TherapyDbContext _context;

    public CategoriesController(TherapyDbContext context)
    {
        _context = context;
    }

    public record CreateCategoryDto(
        string? Id,
        string Name,
        string? Description,
        decimal BasePrice,
        int EstimatedDurationMinutes,
        string? IconName
    );

    public record UpdateCategoryDto(
        string Name,
        string? Description,
        decimal BasePrice,
        int EstimatedDurationMinutes,
        string? IconName
    );

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TherapyCategory>>> GetCategories()
    {
        var categories = await _context.Categories.AsNoTracking().ToListAsync();
        return Ok(categories);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategory(string id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound(new { message = "Category not found." });
        return Ok(category);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Category name is required." });
        }

        var id = !string.IsNullOrWhiteSpace(dto.Id)
            ? dto.Id.Trim().ToLower().Replace(" ", "_")
            : $"cat_{dto.Name.Trim().ToLower().Replace(" ", "_")}_{DateTime.UtcNow.Ticks % 10000}";

        var existing = await _context.Categories.FindAsync(id);
        if (existing != null)
        {
            return BadRequest(new { message = $"Category with ID '{id}' already exists." });
        }

        var category = new TherapyCategory
        {
            Id = id,
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            BasePrice = dto.BasePrice > 0 ? dto.BasePrice : 750m,
            EstimatedDurationMinutes = dto.EstimatedDurationMinutes > 0 ? dto.EstimatedDurationMinutes : 45,
            IconName = !string.IsNullOrWhiteSpace(dto.IconName) ? dto.IconName.Trim() : "fitness"
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Category created successfully.", category });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] UpdateCategoryDto dto)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound(new { message = "Category not found." });

        if (!string.IsNullOrWhiteSpace(dto.Name)) category.Name = dto.Name.Trim();
        if (dto.Description != null) category.Description = dto.Description.Trim();
        if (dto.BasePrice > 0) category.BasePrice = dto.BasePrice;
        if (dto.EstimatedDurationMinutes > 0) category.EstimatedDurationMinutes = dto.EstimatedDurationMinutes;
        if (!string.IsNullOrWhiteSpace(dto.IconName)) category.IconName = dto.IconName.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Category updated successfully.", category });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(string id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound(new { message = "Category not found." });

        // Check if any service requests use this category
        var isUsed = await _context.ServiceRequests.AnyAsync(r => r.CategoryId == id);
        if (isUsed)
        {
            return BadRequest(new { message = "Cannot delete category because active or historical requests reference it." });
        }

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Category deleted successfully." });
    }
}

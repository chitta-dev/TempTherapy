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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TherapyCategory>>> GetCategories()
    {
        var categories = await _context.Categories.AsNoTracking().ToListAsync();
        return Ok(categories);
    }
}

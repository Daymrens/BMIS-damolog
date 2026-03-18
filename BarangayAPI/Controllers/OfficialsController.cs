using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarangayAPI.Data;
using BarangayAPI.Models;

namespace BarangayAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OfficialsController : ControllerBase
{
    private readonly AppDbContext _db;
    public OfficialsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.Officials.OrderBy(o => o.Position).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var o = await _db.Officials.FindAsync(id);
        return o is null ? NotFound() : Ok(o);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Official official)
    {
        _db.Officials.Add(official);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = official.Id }, official);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Official official)
    {
        if (id != official.Id) return BadRequest();
        _db.Entry(official).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var o = await _db.Officials.FindAsync(id);
        if (o is null) return NotFound();
        _db.Officials.Remove(o);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

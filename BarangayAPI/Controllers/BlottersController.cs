using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarangayAPI.Data;
using BarangayAPI.Models;

namespace BarangayAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BlottersController : ControllerBase
{
    private readonly AppDbContext _db;
    public BlottersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? type)
    {
        var q = _db.Blotters.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(b => b.Complainant.Contains(search) || b.Respondent.Contains(search)
                           || b.Incident.Contains(search)   || b.CaseNumber.Contains(search));
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(b => b.Status == status);
        if (!string.IsNullOrWhiteSpace(type))   q = q.Where(b => b.IncidentType == type);
        return Ok(await q.OrderByDescending(b => b.FiledDate).ToListAsync());
    }

    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        var now = DateTime.UtcNow;
        var thisMonth = new DateTime(now.Year, now.Month, 1);
        return Ok(new
        {
            Total          = await _db.Blotters.CountAsync(),
            Pending        = await _db.Blotters.CountAsync(b => b.Status == "Pending"),
            UnderMediation = await _db.Blotters.CountAsync(b => b.Status == "Under Mediation"),
            Settled        = await _db.Blotters.CountAsync(b => b.Status == "Settled"),
            Escalated      = await _db.Blotters.CountAsync(b => b.Status == "Escalated"),
            ThisMonth      = await _db.Blotters.CountAsync(b => b.FiledDate >= thisMonth),
            UpcomingHearings = await _db.Blotters
                .Where(b => b.HearingDate >= now && b.Status != "Settled" && b.Status != "Dismissed")
                .OrderBy(b => b.HearingDate)
                .Take(5)
                .Select(b => new { b.CaseNumber, b.Complainant, b.Respondent, b.Incident, b.HearingDate, b.Status })
                .ToListAsync(),
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var b = await _db.Blotters.FindAsync(id);
        return b is null ? NotFound() : Ok(b);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Blotter blotter)
    {
        blotter.CaseNumber = $"BLT-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
        blotter.FiledDate  = DateTime.UtcNow;
        _db.Blotters.Add(blotter);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = blotter.Id }, blotter);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Blotter blotter)
    {
        if (id != blotter.Id) return BadRequest();
        if (blotter.Status is "Settled" or "Dismissed" && blotter.ResolvedDate is null)
            blotter.ResolvedDate = DateTime.UtcNow;
        _db.Entry(blotter).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var b = await _db.Blotters.FindAsync(id);
        if (b is null) return NotFound();
        _db.Blotters.Remove(b);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

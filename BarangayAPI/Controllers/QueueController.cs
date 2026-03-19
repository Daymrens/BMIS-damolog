using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarangayAPI.Data;
using BarangayAPI.Models;

namespace BarangayAPI.Controllers;

[ApiController]
[Route("api/queue")]
public class QueueController : ControllerBase
{
    private readonly AppDbContext _db;
    public QueueController(AppDbContext db) => _db = db;

    // GET /api/queue?date=2025-03-17&status=Pending
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date, [FromQuery] string? status)
    {
        var query = _db.QueueRequests.Include(q => q.Resident).Include(q => q.IssuedDocument).AsQueryable();

        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var d))
            query = query.Where(q => q.RequestedAt.Date == d.ToDateTime(TimeOnly.MinValue).Date);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(q => q.Status == status);

        return Ok(await query.OrderBy(q => q.RequestedAt).ToListAsync());
    }

    // GET /api/queue/today
    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var today = DateTime.UtcNow.Date;
        var list = await _db.QueueRequests
            .Include(q => q.Resident)
            .Include(q => q.IssuedDocument)
            .Where(q => q.RequestedAt.Date == today)
            .OrderBy(q => q.RequestedAt)
            .ToListAsync();
        return Ok(list);
    }

    // GET /api/queue/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var today = DateTime.UtcNow.Date;
        return Ok(new
        {
            TodayTotal      = await _db.QueueRequests.CountAsync(q => q.RequestedAt.Date == today),
            TodayPending    = await _db.QueueRequests.CountAsync(q => q.RequestedAt.Date == today && q.Status == "Pending"),
            TodayProcessing = await _db.QueueRequests.CountAsync(q => q.RequestedAt.Date == today && q.Status == "Processing"),
            TodayReleased   = await _db.QueueRequests.CountAsync(q => q.RequestedAt.Date == today && q.Status == "Released"),
        });
    }

    // GET /api/queue/lookup?q=Q-0319-001
    [HttpGet("lookup")]
    public async Task<IActionResult> Lookup([FromQuery] string q)
    {
        var req = await _db.QueueRequests
            .Include(x => x.Resident)
            .Include(x => x.IssuedDocument)
            .FirstOrDefaultAsync(x => x.QueueNumber == q);
        return req is null ? NotFound(new { message = $"Queue number '{q}' not found." }) : Ok(req);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var q = await _db.QueueRequests
            .Include(q => q.Resident)
            .Include(q => q.IssuedDocument)
            .FirstOrDefaultAsync(q => q.Id == id);
        return q is null ? NotFound() : Ok(q);
    }

    [HttpPost]
    public async Task<IActionResult> Create(QueueRequest req)
    {
        var today = DateTime.UtcNow.Date;
        var todayCount = await _db.QueueRequests.CountAsync(q => q.RequestedAt.Date == today);
        req.QueueNumber = $"Q-{DateTime.UtcNow:MMdd}-{(todayCount + 1):D3}";
        req.RequestedAt = DateTime.UtcNow;
        req.Status = "Pending";

        _db.QueueRequests.Add(req);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = req.Id }, req);
    }

    // PATCH /api/queue/{id}/status
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusUpdate body)
    {
        var req = await _db.QueueRequests.FindAsync(id);
        if (req is null) return NotFound();

        req.Status = body.Status;
        if (body.Status == "Processing") req.ProcessedAt = DateTime.UtcNow;
        if (body.Status == "Released")   req.ReleasedAt  = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(body.Notes)) req.Notes = body.Notes;

        await _db.SaveChangesAsync();
        return Ok(req);
    }

    // PATCH /api/queue/{id}/document — saves issuedDocumentId after doc printed, before payment collected
    [HttpPatch("{id}/document")]
    public async Task<IActionResult> SetDocument(int id, [FromBody] SetDocumentBody body)
    {
        var req = await _db.QueueRequests.FindAsync(id);
        if (req is null) return NotFound();
        req.IssuedDocumentId = body.DocumentId;
        await _db.SaveChangesAsync();
        return Ok(req);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var req = await _db.QueueRequests.FindAsync(id);
        if (req is null) return NotFound();
        _db.QueueRequests.Remove(req);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record StatusUpdate(string Status, string? Notes);
public record SetDocumentBody(int DocumentId);

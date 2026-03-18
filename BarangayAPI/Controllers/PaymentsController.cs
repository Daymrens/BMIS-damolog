using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarangayAPI.Data;
using BarangayAPI.Models;

namespace BarangayAPI.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public PaymentsController(AppDbContext db) => _db = db;

    // GET /api/payments?date=2025-03-17&category=Clearance Fee
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date, [FromQuery] string? category)
    {
        var query = _db.Payments.Include(p => p.Resident).Include(p => p.Document).AsQueryable();

        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var d))
            query = query.Where(p => p.PaidAt.Date == d.ToDateTime(TimeOnly.MinValue).Date);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        return Ok(await query.OrderByDescending(p => p.PaidAt).ToListAsync());
    }

    // GET /api/payments/summary?date=2025-03-17
    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] string? date)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var thisMonth = new DateTime(now.Year, now.Month, 1);
        var thisYear  = new DateTime(now.Year, 1, 1);

        // If a specific date is requested, use it for the daily report
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var d))
            today = d.ToDateTime(TimeOnly.MinValue).Date;

        var dailyPayments = await _db.Payments
            .Where(p => p.PaidAt.Date == today && p.Status == "Paid")
            .ToListAsync();

        var byCategory = dailyPayments
            .GroupBy(p => p.Category)
            .Select(g => new { Category = g.Key, Count = g.Count(), Total = g.Sum(p => p.Amount) })
            .OrderByDescending(x => x.Total)
            .ToList();

        return Ok(new
        {
            DailyTotal    = dailyPayments.Sum(p => p.Amount),
            DailyCount    = dailyPayments.Count,
            MonthlyTotal  = await _db.Payments.Where(p => p.PaidAt >= thisMonth && p.Status == "Paid").SumAsync(p => p.Amount),
            YearlyTotal   = await _db.Payments.Where(p => p.PaidAt >= thisYear  && p.Status == "Paid").SumAsync(p => p.Amount),
            ByCategory    = byCategory,
            RecentPayments = await _db.Payments
                .Include(p => p.Resident)
                .Where(p => p.PaidAt.Date == today)
                .OrderByDescending(p => p.PaidAt)
                .Take(20)
                .ToListAsync(),
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var p = await _db.Payments.Include(p => p.Resident).Include(p => p.Document).FirstOrDefaultAsync(p => p.Id == id);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Payment payment)
    {
        // Generate OR number: OR-YYYYMMDD-SEQ
        var today = DateTime.UtcNow.Date;
        var todayCount = await _db.Payments.CountAsync(p => p.PaidAt.Date == today);
        payment.OrNumber = $"OR-{DateTime.UtcNow:yyyyMMdd}-{(todayCount + 1):D3}";
        payment.PaidAt   = DateTime.UtcNow;
        payment.Status   = "Paid";

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = payment.Id }, payment);
    }

    // PATCH /api/payments/{id}/void
    [HttpPatch("{id}/void")]
    public async Task<IActionResult> Void(int id, [FromBody] VoidRequest body)
    {
        var p = await _db.Payments.FindAsync(id);
        if (p is null) return NotFound();
        if (p.Status == "Voided") return BadRequest(new { message = "Already voided." });
        p.Status     = "Voided";
        p.VoidReason = body.Reason;
        await _db.SaveChangesAsync();
        return Ok(p);
    }
}

public record VoidRequest(string Reason);

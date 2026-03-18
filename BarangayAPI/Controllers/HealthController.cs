using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarangayAPI.Data;
using BarangayAPI.Models;

namespace BarangayAPI.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController(AppDbContext db) : ControllerBase
{
    // ── Health Records ────────────────────────────────────────────────────────

    [HttpGet("records")]
    public async Task<IActionResult> GetRecords([FromQuery] string? sitio, [FromQuery] string? condition)
    {
        var residents = await db.Residents.ToListAsync();
        var records   = await db.HealthRecords.ToListAsync();

        var result = residents
            .Where(r => string.IsNullOrWhiteSpace(sitio) || r.Sitio == sitio)
            .Select(r => new {
                Resident = r,
                Record   = records.FirstOrDefault(h => h.ResidentId == r.Id),
            })
            .Where(x => string.IsNullOrWhiteSpace(condition) ||
                (x.Record != null && x.Record.ChronicConditions.Contains(condition, StringComparison.OrdinalIgnoreCase)))
            .Select(x => new {
                x.Resident.Id, x.Resident.FirstName, x.Resident.LastName,
                x.Resident.BirthDate, x.Resident.Gender, x.Resident.Sitio,
                x.Resident.Address, x.Resident.ContactNumber,
                x.Resident.IsSenior, x.Resident.IsPWD, x.Resident.Is4Ps,
                Age = (int)((DateTime.UtcNow - x.Resident.BirthDate).TotalDays / 365.25),
                HealthRecord = x.Record,
            })
            .OrderBy(x => x.Sitio).ThenBy(x => x.LastName)
            .ToList();

        return Ok(result);
    }

    [HttpGet("records/{residentId}")]
    public async Task<IActionResult> GetRecord(int residentId)
    {
        var record = await db.HealthRecords.FirstOrDefaultAsync(h => h.ResidentId == residentId);
        return Ok(record); // null is fine — means no record yet
    }

    [HttpPost("records")]
    public async Task<IActionResult> UpsertRecord([FromBody] HealthRecord body)
    {
        var existing = await db.HealthRecords.FirstOrDefaultAsync(h => h.ResidentId == body.ResidentId);
        if (existing != null)
        {
            existing.BloodType         = body.BloodType;
            existing.Allergies         = body.Allergies;
            existing.ChronicConditions = body.ChronicConditions;
            existing.Medications       = body.Medications;
            existing.PhilHealthNo      = body.PhilHealthNo;
            existing.Notes             = body.Notes;
            existing.UpdatedAt         = DateTime.UtcNow;
            existing.UpdatedBy         = body.UpdatedBy;
            await db.SaveChangesAsync();
            return Ok(existing);
        }
        body.CreatedAt = DateTime.UtcNow;
        body.UpdatedAt = DateTime.UtcNow;
        db.HealthRecords.Add(body);
        await db.SaveChangesAsync();
        return Ok(body);
    }

    // ── Vaccination Records ───────────────────────────────────────────────────

    [HttpGet("vaccinations")]
    public async Task<IActionResult> GetVaccinations(
        [FromQuery] string? vaccine,
        [FromQuery] string? sitio,
        [FromQuery] int? residentId)
    {
        var q = db.VaccinationRecords.Include(v => v.Resident).AsQueryable();
        if (residentId.HasValue)                    q = q.Where(v => v.ResidentId == residentId.Value);
        if (!string.IsNullOrWhiteSpace(vaccine))    q = q.Where(v => v.VaccineName == vaccine);
        if (!string.IsNullOrWhiteSpace(sitio))      q = q.Where(v => v.Resident!.Sitio == sitio);
        return Ok(await q.OrderByDescending(v => v.DateGiven).ToListAsync());
    }

    [HttpPost("vaccinations")]
    public async Task<IActionResult> AddVaccination([FromBody] VaccinationRecord body)
    {
        body.CreatedAt = DateTime.UtcNow;
        db.VaccinationRecords.Add(body);
        await db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpDelete("vaccinations/{id}")]
    public async Task<IActionResult> DeleteVaccination(int id)
    {
        var v = await db.VaccinationRecords.FindAsync(id);
        if (v is null) return NotFound();
        db.VaccinationRecords.Remove(v);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Health Workers ────────────────────────────────────────────────────────

    [HttpGet("workers")]
    public async Task<IActionResult> GetWorkers() =>
        Ok(await db.HealthWorkers.OrderBy(w => w.Sitio).ThenBy(w => w.Name).ToListAsync());

    [HttpPost("workers")]
    public async Task<IActionResult> AddWorker([FromBody] HealthWorker body)
    {
        body.AssignedSince = DateTime.UtcNow;
        db.HealthWorkers.Add(body);
        await db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpPut("workers/{id}")]
    public async Task<IActionResult> UpdateWorker(int id, [FromBody] HealthWorker body)
    {
        var w = await db.HealthWorkers.FindAsync(id);
        if (w is null) return NotFound();
        w.Name = body.Name; w.Role = body.Role; w.Sitio = body.Sitio;
        w.ContactNumber = body.ContactNumber; w.Qualifications = body.Qualifications;
        w.IsActive = body.IsActive; w.Notes = body.Notes;
        await db.SaveChangesAsync();
        return Ok(w);
    }

    [HttpDelete("workers/{id}")]
    public async Task<IActionResult> DeleteWorker(int id)
    {
        var w = await db.HealthWorkers.FindAsync(id);
        if (w is null) return NotFound();
        db.HealthWorkers.Remove(w);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Summary stats ─────────────────────────────────────────────────────────

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var now          = DateTime.UtcNow;
        var seniorCutoff = now.AddYears(-60);
        var minorCutoff  = now.AddYears(-18);

        var totalResidents  = await db.Residents.CountAsync();
        var withRecords     = await db.HealthRecords.CountAsync();
        var withPhilHealth  = await db.HealthRecords.CountAsync(h => h.PhilHealthNo != "");
        var withConditions  = await db.HealthRecords.CountAsync(h => h.ChronicConditions != "");
        var totalVax        = await db.VaccinationRecords.CountAsync();
        var activeWorkers   = await db.HealthWorkers.CountAsync(w => w.IsActive);

        var vaxByVaccine = await db.VaccinationRecords
            .GroupBy(v => v.VaccineName)
            .Select(g => new { Vaccine = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        var conditionBreakdown = await db.HealthRecords
            .Where(h => h.ChronicConditions != "")
            .Select(h => h.ChronicConditions)
            .ToListAsync();

        // Parse comma-separated conditions
        var conditionCounts = conditionBreakdown
            .SelectMany(c => c.Split(',', StringSplitOptions.RemoveEmptyEntries))
            .Select(c => c.Trim())
            .Where(c => c.Length > 0)
            .GroupBy(c => c)
            .Select(g => new { Condition = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToList();

        // Due for next dose (next 30 days)
        var dueSoon = await db.VaccinationRecords
            .Include(v => v.Resident)
            .Where(v => v.NextDoseDate.HasValue && v.NextDoseDate.Value >= now && v.NextDoseDate.Value <= now.AddDays(30))
            .OrderBy(v => v.NextDoseDate)
            .Take(20)
            .Select(v => new {
                v.Id, v.ResidentId, v.VaccineName, v.DoseNumber, v.NextDoseDate,
                ResidentName = v.Resident != null ? $"{v.Resident.LastName}, {v.Resident.FirstName}" : "",
                Sitio = v.Resident != null ? v.Resident.Sitio : "",
            })
            .ToListAsync();

        return Ok(new {
            TotalResidents  = totalResidents,
            WithHealthRecord = withRecords,
            WithPhilHealth  = withPhilHealth,
            WithConditions  = withConditions,
            TotalVaccinations = totalVax,
            ActiveWorkers   = activeWorkers,
            VaxByVaccine    = vaxByVaccine,
            ConditionBreakdown = conditionCounts,
            DueSoon         = dueSoon,
        });
    }
}

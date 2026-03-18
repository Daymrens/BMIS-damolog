using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarangayAPI.Data;
using BarangayAPI.Models;

namespace BarangayAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResidentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ResidentsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? sitio,
        [FromQuery] bool? isVoter,
        [FromQuery] bool? isSenior,
        [FromQuery] bool? isPWD,
        [FromQuery] bool? is4Ps,
        [FromQuery] bool? isMinor)
    {
        var now          = DateTime.UtcNow;
        var seniorCutoff = now.AddYears(-60);
        var minorCutoff  = now.AddYears(-18);

        var query = _db.Residents.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r =>
                r.FirstName.Contains(search) ||
                r.LastName.Contains(search) ||
                r.Address.Contains(search) ||
                r.HouseholdNo.Contains(search) ||
                r.Occupation.Contains(search));
        if (!string.IsNullOrWhiteSpace(sitio))
            query = query.Where(r => r.Sitio == sitio);
        if (isVoter.HasValue)  query = query.Where(r => r.IsVoter == isVoter.Value);
        if (isSenior.HasValue) query = query.Where(r => r.IsSenior || r.BirthDate <= seniorCutoff);
        if (isPWD.HasValue)    query = query.Where(r => r.IsPWD == isPWD.Value);
        if (is4Ps.HasValue)    query = query.Where(r => r.Is4Ps == is4Ps.Value);
        if (isMinor.HasValue)  query = query.Where(r => r.BirthDate > minorCutoff);
        return Ok(await query.OrderBy(r => r.LastName).ToListAsync());
    }

    // ── Duplicate detection ──────────────────────────────────────────────────
    // Returns groups of residents that are likely duplicates.
    // Matching rules (any match = flagged):
    //   1. Exact same normalized full name
    //   2. Same last name + same birth date
    //   3. Same first name + same last name + same sitio (different middle name / typo)
    [HttpGet("duplicates")]
    public async Task<IActionResult> GetDuplicates()
    {
        var all = await _db.Residents.OrderBy(r => r.LastName).ToListAsync();

        static string Norm(string s) =>
            (s ?? "").Trim().ToLowerInvariant()
                     .Replace("ñ", "n").Replace(".", "").Replace("-", " ");

        var groups = new List<List<Resident>>();
        var used   = new HashSet<int>();

        for (int i = 0; i < all.Count; i++)
        {
            if (used.Contains(all[i].Id)) continue;
            var group = new List<Resident> { all[i] };

            for (int j = i + 1; j < all.Count; j++)
            {
                if (used.Contains(all[j].Id)) continue;
                var a = all[i]; var b = all[j];

                bool sameFullName = Norm(a.FirstName + a.LastName + a.MiddleName) ==
                                    Norm(b.FirstName + b.LastName + b.MiddleName);

                bool sameLastAndBirth = Norm(a.LastName) == Norm(b.LastName) &&
                                        a.BirthDate != default && b.BirthDate != default &&
                                        a.BirthDate.Date == b.BirthDate.Date;

                bool sameFirstLast = Norm(a.FirstName) == Norm(b.FirstName) &&
                                     Norm(a.LastName)  == Norm(b.LastName)  &&
                                     Norm(a.Sitio)     == Norm(b.Sitio)     &&
                                     !string.IsNullOrWhiteSpace(a.Sitio);

                if (sameFullName || sameLastAndBirth || sameFirstLast)
                {
                    group.Add(b);
                    used.Add(b.Id);
                }
            }

            if (group.Count > 1)
            {
                used.Add(all[i].Id);
                groups.Add(group);
            }
        }

        return Ok(groups.Select(g => new {
            count   = g.Count,
            reason  = GetReason(g),
            members = g,
        }));
    }

    private static string GetReason(List<Resident> g)
    {
        static string Norm(string s) => (s ?? "").Trim().ToLowerInvariant();
        var a = g[0]; var b = g[1];
        if (Norm(a.FirstName + a.LastName + a.MiddleName) == Norm(b.FirstName + b.LastName + b.MiddleName))
            return "Exact same full name";
        if (Norm(a.LastName) == Norm(b.LastName) && a.BirthDate.Date == b.BirthDate.Date)
            return "Same last name & birth date";
        return "Same first & last name in same sitio";
    }

    // ── Check duplicates for a single entry (used by frontend live check) ──
    [HttpGet("check-duplicate")]
    public async Task<IActionResult> CheckDuplicate(
        [FromQuery] string firstName,
        [FromQuery] string lastName,
        [FromQuery] string? middleName,
        [FromQuery] string? birthDate,
        [FromQuery] int? excludeId)
    {
        static string Norm(string s) => (s ?? "").Trim().ToLowerInvariant().Replace("ñ","n").Replace(".","").Replace("-"," ");

        var fn = Norm(firstName); var ln = Norm(lastName); var mn = Norm(middleName ?? "");
        DateTime? bd = null;
        if (!string.IsNullOrWhiteSpace(birthDate) && DateTime.TryParse(birthDate, out var parsed)) bd = parsed.Date;

        var query = _db.Residents.AsQueryable();
        if (excludeId.HasValue) query = query.Where(r => r.Id != excludeId.Value);
        var candidates = await query.ToListAsync();

        var matches = candidates.Where(r => {
            bool sameFullName = Norm(r.FirstName + r.LastName + r.MiddleName) == fn + ln + mn;
            bool sameLastBirth = Norm(r.LastName) == ln && bd.HasValue &&
                                 r.BirthDate != default && r.BirthDate.Date == bd.Value;
            bool sameFirstLast = Norm(r.FirstName) == fn && Norm(r.LastName) == ln;
            return sameFullName || sameLastBirth || sameFirstLast;
        }).ToList();

        return Ok(matches);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var now = DateTime.UtcNow;
        var seniorCutoff = now.AddYears(-60);
        var minorCutoff  = now.AddYears(-18);
        return Ok(new
        {
            Total    = await _db.Residents.CountAsync(),
            Seniors  = await _db.Residents.CountAsync(r => r.IsSenior || r.BirthDate <= seniorCutoff),
            Minors   = await _db.Residents.CountAsync(r => r.BirthDate > minorCutoff),
            Voters   = await _db.Residents.CountAsync(r => r.IsVoter),
            PWD      = await _db.Residents.CountAsync(r => r.IsPWD),
            FourPs   = await _db.Residents.CountAsync(r => r.Is4Ps),
            Male     = await _db.Residents.CountAsync(r => r.Gender == "Male"),
            Female   = await _db.Residents.CountAsync(r => r.Gender == "Female"),
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var r = await _db.Residents.FindAsync(id);
        return r is null ? NotFound() : Ok(r);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Resident resident)
    {
        _db.Residents.Add(resident);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = resident.Id }, resident);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Resident resident)
    {
        if (id != resident.Id) return BadRequest();
        _db.Entry(resident).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var r = await _db.Residents.FindAsync(id);
        if (r is null) return NotFound();
        _db.Residents.Remove(r);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarangayAPI.Data;
using BarangayAPI.Models;

namespace BarangayAPI.Controllers;

[ApiController]
[Route("api/family")]
public class FamilyController : ControllerBase
{
    private readonly AppDbContext _db;
    public FamilyController(AppDbContext db) => _db = db;

    // ── Full tree for one resident ───────────────────────────────────────────
    [HttpGet("{residentId}/tree")]
    public async Task<IActionResult> GetTree(int residentId)
    {
        var resident = await _db.Residents.FindAsync(residentId);
        if (resident is null) return NotFound();

        var now = DateTime.UtcNow;
        var resAge = resident.BirthDate != default
            ? (int?)((now - resident.BirthDate).TotalDays / 365.25)
            : null;

        var links = await _db.FamilyRelationships
            .Where(r => r.ResidentId == residentId || r.RelatedResidentId == residentId)
            .ToListAsync();

        var relatedIds = links
            .Select(l => l.ResidentId == residentId ? l.RelatedResidentId : l.ResidentId)
            .Distinct().ToList();

        var relatedPeople = await _db.Residents
            .Where(r => relatedIds.Contains(r.Id))
            .ToListAsync();

        var members = relatedPeople.Select(r =>
        {
            var link = links.FirstOrDefault(l =>
                (l.ResidentId == residentId && l.RelatedResidentId == r.Id) ||
                (l.RelatedResidentId == residentId && l.ResidentId == r.Id));
            var role = link is not null && link.ResidentId == residentId
                ? link.Role
                : InvertRole(link?.Role ?? "Other");
            var age = r.BirthDate != default
                ? (int?)((now - r.BirthDate).TotalDays / 365.25)
                : null;
            return new
            {
                linkId = link?.Id,
                id = r.Id,
                firstName = r.FirstName,
                lastName = r.LastName,
                middleName = r.MiddleName,
                birthDate = r.BirthDate,
                gender = r.Gender,
                sitio = r.Sitio,
                address = r.Address,
                contactNumber = r.ContactNumber,
                isVoter = r.IsVoter,
                isSenior = r.IsSenior,
                isPWD = r.IsPWD,
                is4Ps = r.Is4Ps,
                age,
                role,
                notes = link?.Notes ?? "",
            };
        }).ToList();

        return Ok(new
        {
            resident = new
            {
                id = resident.Id,
                firstName = resident.FirstName,
                lastName = resident.LastName,
                middleName = resident.MiddleName,
                birthDate = resident.BirthDate,
                gender = resident.Gender,
                sitio = resident.Sitio,
                address = resident.Address,
                contactNumber = resident.ContactNumber,
                isVoter = resident.IsVoter,
                isSenior = resident.IsSenior,
                isPWD = resident.IsPWD,
                is4Ps = resident.Is4Ps,
                age = resAge,
            },
            members,
        });
    }

    // ── Household tree ───────────────────────────────────────────────────────
    [HttpGet("household")]
    public async Task<IActionResult> GetHouseholdTree(
        [FromQuery] string? sitio,
        [FromQuery] string? householdNo,
        [FromQuery] string? address)
    {
        var query = _db.Residents.AsQueryable();

        if (!string.IsNullOrWhiteSpace(sitio))
            query = query.Where(r => r.Sitio == sitio);

        if (!string.IsNullOrWhiteSpace(householdNo))
            query = query.Where(r => r.HouseholdNo == householdNo);
        else if (!string.IsNullOrWhiteSpace(address))
            query = query.Where(r => r.Address == address);

        var members = await query.ToListAsync();

        if (members.Count == 0)
            return Ok(new { members = Array.Empty<object>(), links = Array.Empty<object>() });

        var now = DateTime.UtcNow;
        var ids = members.Select(m => m.Id).ToList();

        var links = await _db.FamilyRelationships
            .Where(r => ids.Contains(r.ResidentId) && ids.Contains(r.RelatedResidentId))
            .ToListAsync();

        var enrichedMembers = members.Select(r =>
        {
            var age = r.BirthDate != default
                ? (int?)((now - r.BirthDate).TotalDays / 365.25)
                : null;
            return new
            {
                id = r.Id,
                firstName = r.FirstName,
                lastName = r.LastName,
                middleName = r.MiddleName,
                birthDate = r.BirthDate,
                gender = r.Gender,
                sitio = r.Sitio,
                address = r.Address,
                contactNumber = r.ContactNumber,
                isVoter = r.IsVoter,
                isSenior = r.IsSenior,
                isPWD = r.IsPWD,
                is4Ps = r.Is4Ps,
                age,
            };
        }).ToList();

        var enrichedLinks = links.Select(l => new
        {
            id = l.Id,
            residentId = l.ResidentId,
            relatedResidentId = l.RelatedResidentId,
            role = l.Role,
            notes = l.Notes,
        }).ToList();

        return Ok(new { members = enrichedMembers, links = enrichedLinks });
    }

    // ── Add relationship ─────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create(FamilyRelationship rel)
    {
        if (rel.ResidentId == rel.RelatedResidentId)
            return BadRequest("Cannot link a resident to themselves.");

        var exists = await _db.FamilyRelationships.AnyAsync(r =>
            (r.ResidentId == rel.ResidentId && r.RelatedResidentId == rel.RelatedResidentId) ||
            (r.ResidentId == rel.RelatedResidentId && r.RelatedResidentId == rel.ResidentId));

        if (exists) return Conflict("A relationship already exists.");

        rel.CreatedAt = DateTime.UtcNow;
        _db.FamilyRelationships.Add(rel);
        await _db.SaveChangesAsync();
        return Ok(rel);
    }

    // ── Update role / notes ──────────────────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, FamilyRelationship rel)
    {
        var existing = await _db.FamilyRelationships.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Role = rel.Role;
        existing.Notes = rel.Notes;
        await _db.SaveChangesAsync();
        return Ok(existing);
    }

    // ── Remove relationship ──────────────────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var rel = await _db.FamilyRelationships.FindAsync(id);
        if (rel is null) return NotFound();
        _db.FamilyRelationships.Remove(rel);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static string InvertRole(string role) => role switch
    {
        "Parent"    => "Child",
        "Child"     => "Parent",
        "Guardian"  => "Dependent",
        "Dependent" => "Guardian",
        _           => role,
    };
}

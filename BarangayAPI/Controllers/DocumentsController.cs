using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarangayAPI.Data;
using BarangayAPI.Models;

namespace BarangayAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await db.Documents.Include(d => d.Resident)
            .OrderByDescending(d => d.IssuedAt).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var d = await db.Documents.Include(d => d.Resident).FirstOrDefaultAsync(d => d.Id == id);
        return d is null ? NotFound() : Ok(d);
    }

    // History for a specific document
    [HttpGet("{id}/history")]
    public async Task<IActionResult> GetHistory(int id) =>
        Ok(await db.DocumentVersions
            .Where(v => v.DocumentId == id)
            .OrderBy(v => v.Version)
            .ToListAsync());

    // All version history (for the version control log view)
    [HttpGet("history")]
    public async Task<IActionResult> GetAllHistory(
        [FromQuery] string? docType,
        [FromQuery] string? action,
        [FromQuery] int? year)
    {
        var q = db.DocumentVersions.AsQueryable();
        if (!string.IsNullOrWhiteSpace(docType)) q = q.Where(v => v.DocumentType == docType);
        if (!string.IsNullOrWhiteSpace(action))  q = q.Where(v => v.Action == action);
        if (year.HasValue) q = q.Where(v => v.CreatedAt.Year == year.Value);

        var versions = await q.OrderByDescending(v => v.CreatedAt).Take(500).ToListAsync();

        // Attach document + resident info
        var docIds = versions.Select(v => v.DocumentId).Distinct().ToList();
        var docs = await db.Documents.Include(d => d.Resident)
            .Where(d => docIds.Contains(d.Id)).ToListAsync();

        var result = versions.Select(v => {
            var doc = docs.FirstOrDefault(d => d.Id == v.DocumentId);
            return new {
                v.Id, v.DocumentId, v.Version, v.Action,
                v.DocumentType, v.Purpose, v.IssuedBy,
                v.ControlNumber, v.ChangeNote, v.ChangedBy, v.CreatedAt,
                ResidentName = doc?.Resident != null
                    ? $"{doc.Resident.LastName}, {doc.Resident.FirstName}"
                    : $"ID:{v.DocumentId}",
                ResidentSitio = doc?.Resident?.Sitio ?? "",
            };
        });

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Document document)
    {
        document.IssuedAt = DateTime.UtcNow;
        document.ControlNumber = $"BRY-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
        db.Documents.Add(document);
        await db.SaveChangesAsync();

        // Record version 1 — original issue
        db.DocumentVersions.Add(new DocumentVersion {
            DocumentId   = document.Id,
            Version      = 1,
            Action       = "Issued",
            DocumentType = document.DocumentType,
            Purpose      = document.Purpose,
            IssuedBy     = document.IssuedBy,
            ControlNumber = document.ControlNumber,
            ChangeNote   = "Original issue",
            ChangedBy    = document.IssuedBy,
            CreatedAt    = document.IssuedAt,
        });
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = document.Id }, document);
    }

    // Reissue — creates a new version entry, optionally updates purpose/issuedBy
    [HttpPost("{id}/reissue")]
    public async Task<IActionResult> Reissue(int id, [FromBody] ReissueRequest req)
    {
        var doc = await db.Documents.Include(d => d.Resident).FirstOrDefaultAsync(d => d.Id == id);
        if (doc is null) return NotFound();

        // Update document fields if provided
        if (!string.IsNullOrWhiteSpace(req.Purpose))  doc.Purpose  = req.Purpose;
        if (!string.IsNullOrWhiteSpace(req.IssuedBy)) doc.IssuedBy = req.IssuedBy;
        doc.IssuedAt = DateTime.UtcNow;

        // New control number for the reissue
        var newControl = $"BRY-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
        doc.ControlNumber = newControl;

        // Next version number
        var lastVersion = await db.DocumentVersions
            .Where(v => v.DocumentId == id)
            .MaxAsync(v => (int?)v.Version) ?? 1;

        db.DocumentVersions.Add(new DocumentVersion {
            DocumentId    = id,
            Version       = lastVersion + 1,
            Action        = "Reissued",
            DocumentType  = doc.DocumentType,
            Purpose       = doc.Purpose,
            IssuedBy      = doc.IssuedBy,
            ControlNumber = newControl,
            ChangeNote    = req.ChangeNote,
            ChangedBy     = req.ChangedBy,
            CreatedAt     = DateTime.UtcNow,
        });

        await db.SaveChangesAsync();
        return Ok(new { document = doc, newControlNumber = newControl });
    }

    // Edit metadata (purpose / issuedBy) without reissuing
    [HttpPatch("{id}/edit")]
    public async Task<IActionResult> Edit(int id, [FromBody] EditDocRequest req)
    {
        var doc = await db.Documents.FindAsync(id);
        if (doc is null) return NotFound();

        var lastVersion = await db.DocumentVersions
            .Where(v => v.DocumentId == id)
            .MaxAsync(v => (int?)v.Version) ?? 1;

        if (!string.IsNullOrWhiteSpace(req.Purpose))  doc.Purpose  = req.Purpose;
        if (!string.IsNullOrWhiteSpace(req.IssuedBy)) doc.IssuedBy = req.IssuedBy;

        db.DocumentVersions.Add(new DocumentVersion {
            DocumentId    = id,
            Version       = lastVersion + 1,
            Action        = "Edited",
            DocumentType  = doc.DocumentType,
            Purpose       = doc.Purpose,
            IssuedBy      = doc.IssuedBy,
            ControlNumber = doc.ControlNumber,
            ChangeNote    = req.ChangeNote,
            ChangedBy     = req.ChangedBy,
            CreatedAt     = DateTime.UtcNow,
        });

        await db.SaveChangesAsync();
        return Ok(doc);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var d = await db.Documents.FindAsync(id);
        if (d is null) return NotFound();
        // Cascade delete versions
        var versions = db.DocumentVersions.Where(v => v.DocumentId == id);
        db.DocumentVersions.RemoveRange(versions);
        db.Documents.Remove(d);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record ReissueRequest(string? Purpose, string? IssuedBy, string ChangeNote, string ChangedBy);
public record EditDocRequest(string? Purpose, string? IssuedBy, string ChangeNote, string ChangedBy);

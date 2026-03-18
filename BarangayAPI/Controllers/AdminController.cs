using BarangayAPI.Data;
using BarangayAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace BarangayAPI.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    static string Hash(string pw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(pw))).ToLower();

    // ── Users ────────────────────────────────────────────────────────

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers() =>
        Ok(await db.Users.Select(u => new {
            u.Id, u.Username, u.FullName, u.Role, u.IsActive, u.CreatedAt, u.LastLogin
        }).ToListAsync());

    [HttpGet("roles")]
    public IActionResult GetRoles() =>
        Ok(new[] { "Admin", "Secretary", "Treasurer", "Staff" });

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Username == req.Username))
            return BadRequest(new { message = "Username already exists." });

        var user = new AppUser
        {
            Username = req.Username,
            PasswordHash = Hash(req.Password),
            FullName = req.FullName,
            Role = req.Role,
            IsActive = true
        };
        db.Users.Add(user);
        db.AuditLogs.Add(new AuditLog { Username = req.CreatedBy, Action = "CREATE_USER", Details = $"Created user: {req.Username} ({req.Role})" });
        await db.SaveChangesAsync();
        return Ok(new { user.Id, user.Username, user.FullName, user.Role });
    }

    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        user.FullName = req.FullName;
        user.Role = req.Role;
        user.IsActive = req.IsActive;
        if (!string.IsNullOrWhiteSpace(req.NewPassword))
            user.PasswordHash = Hash(req.NewPassword);

        db.AuditLogs.Add(new AuditLog { Username = req.UpdatedBy, Action = "UPDATE_USER", Details = $"Updated user: {user.Username}" });
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id, [FromQuery] string by = "admin")
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();
        db.Users.Remove(user);
        db.AuditLogs.Add(new AuditLog { Username = by, Action = "DELETE_USER", Details = $"Deleted user: {user.Username}" });
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Audit Log ────────────────────────────────────────────────────

    [HttpGet("audit")]
    public async Task<IActionResult> GetAudit([FromQuery] int limit = 100) =>
        Ok(await db.AuditLogs.OrderByDescending(a => a.Timestamp).Take(limit).ToListAsync());

    // ── DB Backup ────────────────────────────────────────────────────

    [HttpGet("backup")]
    public IActionResult Backup()
    {
        var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "barangay.db");
        if (!System.IO.File.Exists(dbPath)) return NotFound();
        var bytes = System.IO.File.ReadAllBytes(dbPath);
        var filename = $"barangay-backup-{DateTime.Now:yyyyMMdd-HHmmss}.db";
        return File(bytes, "application/octet-stream", filename);
    }

    // ── System Info ──────────────────────────────────────────────────

    [HttpGet("system-info")]
    public async Task<IActionResult> SystemInfo() => Ok(new
    {
        TotalResidents = await db.Residents.CountAsync(),
        TotalOfficials = await db.Officials.CountAsync(),
        TotalDocuments = await db.Documents.CountAsync(),
        TotalBlotters  = await db.Blotters.CountAsync(),
        TotalUsers     = await db.Users.CountAsync(),
        TotalAuditLogs = await db.AuditLogs.CountAsync(),
        DbSizeKb       = new FileInfo(Path.Combine(Directory.GetCurrentDirectory(), "barangay.db")).Length / 1024,
        ServerTime     = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
        DotNetVersion  = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
    });
}

public record CreateUserRequest(string Username, string Password, string FullName, string Role, string CreatedBy);
public record UpdateUserRequest(string FullName, string Role, bool IsActive, string? NewPassword, string UpdatedBy);

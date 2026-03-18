using BarangayAPI.Data;
using BarangayAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace BarangayAPI.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db) : ControllerBase
{
    static string Hash(string pw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(pw))).ToLower();

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u =>
            u.Username == req.Username && u.PasswordHash == Hash(req.Password) && u.IsActive);

        if (user is null) return Unauthorized(new { message = "Invalid username or password." });

        user.LastLogin = DateTime.UtcNow;
        db.AuditLogs.Add(new AuditLog { Username = user.Username, Action = "LOGIN", Details = "Successful login" });
        await db.SaveChangesAsync();

        return Ok(new { user.Id, user.Username, user.FullName, user.Role, user.LastLogin });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);
        if (user is null) return NotFound();
        if (user.PasswordHash != Hash(req.OldPassword))
            return BadRequest(new { message = "Current password is incorrect." });

        user.PasswordHash = Hash(req.NewPassword);
        db.AuditLogs.Add(new AuditLog { Username = req.Username, Action = "CHANGE_PASSWORD", Details = "Password changed" });
        await db.SaveChangesAsync();
        return Ok();
    }
}

public record LoginRequest(string Username, string Password);
public record ChangePasswordRequest(string Username, string OldPassword, string NewPassword);

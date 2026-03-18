namespace BarangayAPI.Models;

public class QueueRequest
{
    public int Id { get; set; }
    public string QueueNumber { get; set; } = string.Empty;   // e.g. Q-001
    public string RequesterName { get; set; } = string.Empty; // walk-in name (may not be in DB)
    public int? ResidentId { get; set; }
    public Resident? Resident { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
    public string RequestType { get; set; } = "Walk-in";      // Walk-in | Online
    public string Status { get; set; } = "Pending";           // Pending | Processing | Released | Cancelled
    public string Notes { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public DateTime? ReleasedAt { get; set; }
}

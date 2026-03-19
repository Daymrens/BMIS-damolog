namespace BarangayAPI.Models;

public class Document
{
    public int Id { get; set; }
    public int? ResidentId { get; set; }
    public Resident? Resident { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public string IssuedBy { get; set; } = string.Empty;
    public string ControlNumber { get; set; } = string.Empty;
}

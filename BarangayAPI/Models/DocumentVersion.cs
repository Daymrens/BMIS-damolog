namespace BarangayAPI.Models;

public class DocumentVersion
{
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public int Version { get; set; }           // 1 = original, 2+ = reissues
    public string Action { get; set; } = "Issued";   // Issued | Reissued | Edited
    public string DocumentType { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public string IssuedBy { get; set; } = string.Empty;
    public string ControlNumber { get; set; } = string.Empty;
    public string ChangeNote { get; set; } = string.Empty;  // reason for reissue/edit
    public string ChangedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

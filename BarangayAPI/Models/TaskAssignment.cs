namespace BarangayAPI.Models;

public class TaskAssignment
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "General"; // General, Inspection, Follow-up, Complaint, Maintenance, Other
    public string Priority { get; set; } = "Normal";  // Low, Normal, High, Urgent
    public string Status { get; set; } = "Pending";   // Pending, In Progress, Done, Cancelled
    public string AssignedTo { get; set; } = string.Empty;   // username or full name
    public string AssignedBy { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Sitio { get; set; } = string.Empty;
    public string RelatedTo { get; set; } = string.Empty;    // e.g. "Blotter #2024-001"
    public DateTime? DueDate { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string CompletionNotes { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

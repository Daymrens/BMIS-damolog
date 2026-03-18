namespace BarangayAPI.Models;

public class LivelihoodProgram
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ProgramType { get; set; } = "Training"; // Training, Employment, Livelihood, Seminar
    public string TargetSkills { get; set; } = string.Empty; // comma-separated skill names
    public string Description { get; set; } = string.Empty;
    public string Organizer { get; set; } = string.Empty;
    public string Venue { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int SlotCount { get; set; } = 0;
    public string Status { get; set; } = "Upcoming"; // Upcoming, Ongoing, Completed, Cancelled
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
}

namespace BarangayAPI.Models;

public class BarangayEvent
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string EventType { get; set; } = "Meeting"; // Meeting | Hearing | Appointment | Community Activity | Other
    public string Location { get; set; } = "";
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Organizer { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "Scheduled"; // Scheduled | Done | Cancelled
    public int? BlotterId { get; set; }   // optional link to blotter case (for hearings)
    public string BlotterCaseNumber { get; set; } = "";
    public string Participants { get; set; } = ""; // free-text list
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = "";
}

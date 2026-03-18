namespace BarangayAPI.Models;

public class Blotter
{
    public int Id { get; set; }
    public string CaseNumber { get; set; } = string.Empty;

    // Parties
    public string Complainant { get; set; } = string.Empty;
    public string ComplainantAddress { get; set; } = string.Empty;
    public string ComplainantContact { get; set; } = string.Empty;
    public string Respondent { get; set; } = string.Empty;
    public string RespondentAddress { get; set; } = string.Empty;
    public string RespondentContact { get; set; } = string.Empty;

    // Incident
    public string IncidentType { get; set; } = string.Empty; // Dispute, Noise, Violence, Theft, Other
    public string Incident { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime IncidentDate { get; set; }
    public DateTime FiledDate { get; set; } = DateTime.UtcNow;

    // Lupon / hearing
    public string LuponChairperson { get; set; } = string.Empty;
    public DateTime? HearingDate { get; set; }
    public string HearingNotes { get; set; } = string.Empty;
    public DateTime? NextHearingDate { get; set; }
    public string Resolution { get; set; } = string.Empty;

    // Status
    public string Status { get; set; } = "Pending"; // Pending | Under Mediation | Settled | Escalated | Dismissed
    public DateTime? ResolvedDate { get; set; }
}

namespace BarangayAPI.Models;

public class HouseVisitLog
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public int? BhwRecordId { get; set; }
    public string VisitType { get; set; } = "Routine"; // Routine, Follow-up, Emergency, Immunization, Prenatal
    public string VisitedBy { get; set; } = string.Empty; // BHW name
    public DateTime VisitDate { get; set; } = DateTime.UtcNow;
    public string Findings { get; set; } = string.Empty;
    public string ActionTaken { get; set; } = string.Empty;
    public string NextVisitDate { get; set; } = string.Empty;
    public string BloodPressure { get; set; } = string.Empty;
    public string Weight { get; set; } = string.Empty;
    public string Temperature { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

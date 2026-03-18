namespace BarangayAPI.Models;

public class EvacueeLog
{
    public int Id { get; set; }
    public int EvacuationCenterId { get; set; }
    public EvacuationCenter? EvacuationCenter { get; set; }
    public int? ResidentId { get; set; }
    public Resident? Resident { get; set; }
    // For walk-ins not in resident DB
    public string EvacueeName { get; set; } = "";
    public string Sitio { get; set; } = "";
    public string Address { get; set; } = "";
    public int HeadCount { get; set; } = 1; // family members included
    public bool HasSenior { get; set; }
    public bool HasPWD { get; set; }
    public bool HasInfant { get; set; }
    public bool HasPregnant { get; set; }
    public string Notes { get; set; } = "";
    public DateTime CheckedInAt { get; set; } = DateTime.UtcNow;
    public DateTime? CheckedOutAt { get; set; }
    public string Status { get; set; } = "Present"; // Present | Departed
    public string RecordedBy { get; set; } = "";
}

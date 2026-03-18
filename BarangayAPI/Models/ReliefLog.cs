namespace BarangayAPI.Models;

public class ReliefLog
{
    public int Id { get; set; }
    public string DisasterName { get; set; } = "";
    public int? ResidentId { get; set; }
    public Resident? Resident { get; set; }
    public string RecipientName { get; set; } = "";
    public string Sitio { get; set; } = "";
    public string Address { get; set; } = "";
    public string ReliefItem { get; set; } = ""; // Food Pack, Hygiene Kit, etc.
    public int Quantity { get; set; } = 1;
    public string Unit { get; set; } = "pack";
    public string DistributedBy { get; set; } = "";
    public string Notes { get; set; } = "";
    public DateTime DistributedAt { get; set; } = DateTime.UtcNow;
}

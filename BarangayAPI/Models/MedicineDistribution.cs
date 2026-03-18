namespace BarangayAPI.Models;

public class MedicineDistribution
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string Quantity { get; set; } = string.Empty; // e.g. "30 tablets", "2 sachets"
    public string Purpose { get; set; } = string.Empty;  // e.g. "Hypertension maintenance"
    public string DistributedBy { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;   // RHU, DOH, Barangay Stock
    public DateTime DistributedAt { get; set; } = DateTime.UtcNow;
    public string NextPickupDate { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

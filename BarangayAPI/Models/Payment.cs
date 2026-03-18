namespace BarangayAPI.Models;

public class Payment
{
    public int Id { get; set; }
    public string OrNumber { get; set; } = string.Empty;       // e.g. OR-20250317-001
    public string PayerName { get; set; } = string.Empty;
    public int? ResidentId { get; set; }
    public Resident? Resident { get; set; }
    public int? DocumentId { get; set; }
    public Document? Document { get; set; }
    public string Category { get; set; } = string.Empty;       // Clearance Fee | Business Permit | Other
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "Cash";        // Cash | GCash | Maya
    public string CollectedBy { get; set; } = string.Empty;
    public string Status { get; set; } = "Paid";               // Paid | Voided
    public string VoidReason { get; set; } = string.Empty;
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
}

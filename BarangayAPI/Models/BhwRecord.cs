namespace BarangayAPI.Models;

public class BhwRecord
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public string Category { get; set; } = string.Empty; // Pregnant, Senior, Child, PWD
    public string Status { get; set; } = "Active"; // Active, Inactive, Delivered, Deceased
    // Pregnant-specific
    public string? LmpDate { get; set; }       // Last Menstrual Period
    public string? EddDate { get; set; }       // Expected Delivery Date
    public int GravidaPara { get; set; } = 0;  // number of pregnancies
    public string RiskLevel { get; set; } = "Low"; // Low, Moderate, High
    // Child-specific
    public string ImmunizationStatus { get; set; } = string.Empty; // Complete, Incomplete, None
    public string NextImmunizationDate { get; set; } = string.Empty;
    // General
    public string AssignedBhw { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

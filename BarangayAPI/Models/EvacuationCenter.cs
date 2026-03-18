namespace BarangayAPI.Models;

public class EvacuationCenter
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Location { get; set; } = "";
    public string Sitio { get; set; } = "";
    public int Capacity { get; set; }
    public string Status { get; set; } = "Standby"; // Standby | Active | Full | Closed
    public string ContactPerson { get; set; } = "";
    public string ContactNumber { get; set; } = "";
    public string Notes { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

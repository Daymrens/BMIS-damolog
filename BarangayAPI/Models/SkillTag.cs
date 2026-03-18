namespace BarangayAPI.Models;

public class SkillTag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // Trade, Agriculture, Service, Tech, Other
    public string Description { get; set; } = string.Empty;
    public string Color { get; set; } = "blue"; // for badge color
    public int ResidentCount { get; set; } = 0; // denormalized for quick display
}

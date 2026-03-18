namespace BarangayAPI.Models;

public class ResidentSkill
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public int SkillTagId { get; set; }
    public string ProficiencyLevel { get; set; } = "Intermediate"; // Beginner, Intermediate, Expert
    public string Notes { get; set; } = string.Empty;
    public bool IsAvailable { get; set; } = true; // available for job referral
    public DateTime TaggedAt { get; set; } = DateTime.UtcNow;
    public string TaggedBy { get; set; } = string.Empty;
}

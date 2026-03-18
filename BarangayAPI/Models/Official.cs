namespace BarangayAPI.Models;

public class Official
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
    public DateTime TermStart { get; set; }
    public DateTime TermEnd { get; set; }
    public bool IsActive { get; set; } = true;
}

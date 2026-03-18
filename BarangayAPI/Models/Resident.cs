namespace BarangayAPI.Models;

public class Resident
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string MiddleName { get; set; } = string.Empty;
    public DateTime BirthDate { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string CivilStatus { get; set; } = string.Empty;
    public string Sitio { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string HouseholdNo { get; set; } = string.Empty;
    public string Occupation { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsVoter { get; set; }
    public bool IsSenior { get; set; }
    public bool IsPWD { get; set; }
    public bool Is4Ps { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

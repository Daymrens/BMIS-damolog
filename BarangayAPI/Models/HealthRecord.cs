namespace BarangayAPI.Models;

// Master health profile per resident
public class HealthRecord
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }
    public string BloodType { get; set; } = string.Empty;       // A+, B-, O+, etc.
    public string Allergies { get; set; } = string.Empty;
    public string ChronicConditions { get; set; } = string.Empty; // Hypertension, Diabetes, etc.
    public string Medications { get; set; } = string.Empty;
    public string PhilHealthNo { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string UpdatedBy { get; set; } = string.Empty;
}

// Individual vaccination entry
public class VaccinationRecord
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }
    public string VaccineName { get; set; } = string.Empty;     // COVID-19, Flu, Hepatitis B, etc.
    public string DoseNumber { get; set; } = string.Empty;      // 1st, 2nd, Booster
    public DateTime DateGiven { get; set; }
    public string BatchNo { get; set; } = string.Empty;
    public string AdministeredBy { get; set; } = string.Empty;  // Health worker name
    public string Venue { get; set; } = string.Empty;
    public DateTime? NextDoseDate { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// Health worker / BHW registry
public class HealthWorker
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;            // BHW, Midwife, Nurse, Doctor
    public string Sitio { get; set; } = string.Empty;           // assigned sitio
    public string ContactNumber { get; set; } = string.Empty;
    public string Qualifications { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime AssignedSince { get; set; } = DateTime.UtcNow;
    public string Notes { get; set; } = string.Empty;
}

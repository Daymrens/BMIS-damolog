namespace BarangayDesktop;

public class Resident
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string MiddleName { get; set; } = "";
    public DateTime BirthDate { get; set; }
    public string Gender { get; set; } = "";
    public string CivilStatus { get; set; } = "";
    public string Sitio { get; set; } = "";
    public string Address { get; set; } = "";
    public string HouseholdNo { get; set; } = "";
    public string Occupation { get; set; } = "";
    public string ContactNumber { get; set; } = "";
    public string Email { get; set; } = "";
    public bool IsVoter { get; set; }
    public bool IsSenior { get; set; }
    public bool IsPWD { get; set; }
    public bool Is4Ps { get; set; }
    public DateTime? CreatedAt { get; set; }
    public string FullName => $"{LastName}, {FirstName} {MiddleName}".Trim();
    public int Age => BirthDate == default ? 0 : (int)((DateTime.Now - BirthDate).TotalDays / 365.25);
}

public class Official
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Position { get; set; } = "";
    public string ContactNumber { get; set; } = "";
    public DateTime TermStart { get; set; }
    public DateTime TermEnd { get; set; }
    public bool IsActive { get; set; }
}

public class Document
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }
    public string DocumentType { get; set; } = "";
    public string Purpose { get; set; } = "";
    public DateTime IssuedAt { get; set; }
    public string IssuedBy { get; set; } = "";
    public string ControlNumber { get; set; } = "";
}

public class Blotter
{
    public int Id { get; set; }
    public string CaseNumber { get; set; } = "";
    public string Complainant { get; set; } = "";
    public string Respondent { get; set; } = "";
    public string IncidentType { get; set; } = "";
    public string Incident { get; set; } = "";
    public string Details { get; set; } = "";
    public string Location { get; set; } = "";
    public DateTime IncidentDate { get; set; }
    public DateTime FiledDate { get; set; }
    public string Status { get; set; } = "Pending";
    public string LuponChairperson { get; set; } = "";
    public DateTime? HearingDate { get; set; }
    public string Resolution { get; set; } = "";
}

public class QueueRequest
{
    public int Id { get; set; }
    public string QueueNumber { get; set; } = "";
    public string RequesterName { get; set; } = "";
    public int? ResidentId { get; set; }
    public string DocumentType { get; set; } = "";
    public string Purpose { get; set; } = "";
    public string ContactNumber { get; set; } = "";
    public string RequestType { get; set; } = "Walk-in";
    public string Status { get; set; } = "Pending";
    public string Notes { get; set; } = "";
    public DateTime RequestedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public DateTime? ReleasedAt { get; set; }
}

public class Payment
{
    public int Id { get; set; }
    public string OrNumber { get; set; } = "";
    public string PayerName { get; set; } = "";
    public string Category { get; set; } = "";
    public string Description { get; set; } = "";
    public double Amount { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public string CollectedBy { get; set; } = "";
    public string Status { get; set; } = "Paid";
    public string VoidReason { get; set; } = "";
    public DateTime PaidAt { get; set; }
}

public class PaymentSummary
{
    public double DailyTotal { get; set; }
    public int DailyCount { get; set; }
    public double MonthlyTotal { get; set; }
    public double YearlyTotal { get; set; }
    public List<CategoryStat> ByCategory { get; set; } = [];
}

public class CategoryStat
{
    public string Category { get; set; } = "";
    public int Count { get; set; }
    public double Total { get; set; }
}

public class LoginResult
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Role { get; set; } = "";
}

public class Stats
{
    public int TotalResidents { get; set; }
    public int TotalOfficials { get; set; }
    public int TotalDocuments { get; set; }
    public int PendingBlotters { get; set; }
    public int MaleResidents { get; set; }
    public int FemaleResidents { get; set; }
    public int RegisteredVoters { get; set; }
    public int SeniorResidents { get; set; }
    public int PwdResidents { get; set; }
    public int FourPsResidents { get; set; }
    public int DocsThisMonth { get; set; }
    public int TodayQueueTotal { get; set; }
    public int TodayQueuePending { get; set; }
    public double TodayCollections { get; set; }
    public double MonthlyRevenue { get; set; }
    public List<DocTypeStat> DocsByType { get; set; } = [];
    public List<BlotterStatusStat> BlottersByStatus { get; set; } = [];
    public List<SitioStat> SitioBreakdown { get; set; } = [];
    public List<RecentResident> RecentResidents { get; set; } = [];
    public List<RecentBlotter> RecentBlotters { get; set; } = [];
}

public class DocTypeStat { public string Type { get; set; } = ""; public int Count { get; set; } }
public class BlotterStatusStat { public string Status { get; set; } = ""; public int Count { get; set; } }
public class SitioStat { public string Sitio { get; set; } = ""; public int Count { get; set; } }
public class RecentResident { public string FirstName { get; set; } = ""; public string LastName { get; set; } = ""; public string Address { get; set; } = ""; public string Sitio { get; set; } = ""; public DateTime CreatedAt { get; set; } }
public class RecentBlotter { public string CaseNumber { get; set; } = ""; public string Complainant { get; set; } = ""; public string Incident { get; set; } = ""; public string Status { get; set; } = ""; public DateTime FiledDate { get; set; } }

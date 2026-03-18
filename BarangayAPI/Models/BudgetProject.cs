namespace BarangayAPI.Models;

public class BudgetProject
{
    public int Id { get; set; }
    public string ProjectCode { get; set; } = "";
    public string Title { get; set; } = "";
    public string Category { get; set; } = ""; // Infrastructure, Social Services, Health, Education, Environment, Other
    public string Description { get; set; } = "";
    public string FundSource { get; set; } = ""; // Barangay Fund, DILG, LGU, DSWD, Other
    public double AllocatedBudget { get; set; }
    public double ActualExpense { get; set; }
    public string Status { get; set; } = "Planned"; // Planned, Ongoing, Completed, Cancelled, On Hold
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public string Implementor { get; set; } = "";
    public string Beneficiaries { get; set; } = "";
    public int BeneficiaryCount { get; set; }
    public string Location { get; set; } = "";
    public string Notes { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = "";
}

public class ProjectExpense
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Description { get; set; } = "";
    public string Category { get; set; } = ""; // Labor, Materials, Equipment, Services, Other
    public double Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string RecordedBy { get; set; } = "";
    public string ReceiptNo { get; set; } = "";
    public string Notes { get; set; } = "";
}

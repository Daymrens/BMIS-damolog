namespace BarangayAPI.Models;

/// <summary>
/// Directed relationship: ResidentId → RelatedResidentId with a Role label.
/// e.g. ResidentId=1 (Juan) → RelatedResidentId=2 (Maria) Role="Spouse"
/// The inverse is stored separately for easy querying.
/// </summary>
public class FamilyRelationship
{
    public int Id { get; set; }
    public int ResidentId { get; set; }        // "from" person
    public int RelatedResidentId { get; set; } // "to" person
    /// <summary>Head, Spouse, Child, Parent, Sibling, Dependent, Guardian, Other</summary>
    public string Role { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

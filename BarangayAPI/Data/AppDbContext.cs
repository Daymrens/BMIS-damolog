using Microsoft.EntityFrameworkCore;
using BarangayAPI.Models;

namespace BarangayAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<Official> Officials => Set<Official>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Blotter> Blotters => Set<Blotter>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<QueueRequest> QueueRequests => Set<QueueRequest>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<EvacuationCenter> EvacuationCenters => Set<EvacuationCenter>();
    public DbSet<EvacueeLog> EvacueeLogs => Set<EvacueeLog>();
    public DbSet<ReliefLog> ReliefLogs => Set<ReliefLog>();
    public DbSet<BarangayEvent> Events => Set<BarangayEvent>();
    public DbSet<BudgetProject> BudgetProjects => Set<BudgetProject>();
    public DbSet<ProjectExpense> ProjectExpenses => Set<ProjectExpense>();
    public DbSet<DocumentVersion> DocumentVersions => Set<DocumentVersion>();
    public DbSet<HealthRecord> HealthRecords => Set<HealthRecord>();
    public DbSet<VaccinationRecord> VaccinationRecords => Set<VaccinationRecord>();
    public DbSet<HealthWorker> HealthWorkers => Set<HealthWorker>();
    public DbSet<FamilyRelationship> FamilyRelationships => Set<FamilyRelationship>();
    public DbSet<SkillTag> SkillTags => Set<SkillTag>();
    public DbSet<ResidentSkill> ResidentSkills => Set<ResidentSkill>();
    public DbSet<LivelihoodProgram> LivelihoodPrograms => Set<LivelihoodProgram>();
    public DbSet<TaskAssignment> Tasks => Set<TaskAssignment>();
    public DbSet<BhwRecord> BhwRecords => Set<BhwRecord>();
    public DbSet<HouseVisitLog> HouseVisitLogs => Set<HouseVisitLog>();
    public DbSet<MedicineDistribution> MedicineDistributions => Set<MedicineDistribution>();
}

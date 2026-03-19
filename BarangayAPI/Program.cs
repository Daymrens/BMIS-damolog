using BarangayAPI.Data;
using BarangayAPI.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=barangay.db"));

builder.Services.AddControllers()
    .AddJsonOptions(o => {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

// Ensure /data directory exists (Railway Volume mount point)
var dbPath = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=barangay.db";
var dataDir = Path.GetDirectoryName(dbPath.Replace("Data Source=", "").Trim());
if (!string.IsNullOrWhiteSpace(dataDir) && !Directory.Exists(dataDir))
    Directory.CreateDirectory(dataDir);

// Auto-migrate on startup + seed default admin
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // Apply schema migrations for new columns (safe to run multiple times)
    var conn = db.Database.GetDbConnection();
    conn.Open();
    var migrations = new[]
    {
        "ALTER TABLE Residents ADD COLUMN HouseholdNo TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE Residents ADD COLUMN Occupation TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE Residents ADD COLUMN IsSenior INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE Residents ADD COLUMN IsPWD INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE Residents ADD COLUMN Is4Ps INTEGER NOT NULL DEFAULT 0",
        // Blotter new columns
        "ALTER TABLE Blotters ADD COLUMN ComplainantAddress TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE Blotters ADD COLUMN ComplainantContact TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE Blotters ADD COLUMN RespondentAddress TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE Blotters ADD COLUMN RespondentContact TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE Blotters ADD COLUMN IncidentType TEXT NOT NULL DEFAULT 'Other'",
        "ALTER TABLE Blotters ADD COLUMN Location TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE Blotters ADD COLUMN LuponChairperson TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE Blotters ADD COLUMN HearingDate TEXT NULL",
        "ALTER TABLE Blotters ADD COLUMN HearingNotes TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE Blotters ADD COLUMN NextHearingDate TEXT NULL",
        "ALTER TABLE Blotters ADD COLUMN Resolution TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE Blotters ADD COLUMN ResolvedDate TEXT NULL",
        // QueueRequests table
        @"CREATE TABLE IF NOT EXISTS QueueRequests (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            QueueNumber TEXT NOT NULL DEFAULT '',
            RequesterName TEXT NOT NULL DEFAULT '',
            ResidentId INTEGER NULL,
            DocumentType TEXT NOT NULL DEFAULT '',
            Purpose TEXT NOT NULL DEFAULT '',
            ContactNumber TEXT NOT NULL DEFAULT '',
            RequestType TEXT NOT NULL DEFAULT 'Walk-in',
            Status TEXT NOT NULL DEFAULT 'Pending',
            Notes TEXT NOT NULL DEFAULT '',
            RequestedAt TEXT NOT NULL DEFAULT '',
            ProcessedAt TEXT NULL,
            ReleasedAt TEXT NULL,
            IssuedDocumentId INTEGER NULL
        )",
        // QueueRequests — add IssuedDocumentId to existing tables (safe, ignored if already exists)
        "ALTER TABLE QueueRequests ADD COLUMN IssuedDocumentId INTEGER NULL",
        @"CREATE TABLE IF NOT EXISTS Payments (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            OrNumber TEXT NOT NULL DEFAULT '',
            PayerName TEXT NOT NULL DEFAULT '',
            ResidentId INTEGER NULL,
            DocumentId INTEGER NULL,
            Category TEXT NOT NULL DEFAULT '',
            Description TEXT NOT NULL DEFAULT '',
            Amount REAL NOT NULL DEFAULT 0,
            PaymentMethod TEXT NOT NULL DEFAULT 'Cash',
            CollectedBy TEXT NOT NULL DEFAULT '',
            Status TEXT NOT NULL DEFAULT 'Paid',
            VoidReason TEXT NOT NULL DEFAULT '',
            PaidAt TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS EvacuationCenters (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL DEFAULT '',
            Location TEXT NOT NULL DEFAULT '',
            Sitio TEXT NOT NULL DEFAULT '',
            Capacity INTEGER NOT NULL DEFAULT 0,
            Status TEXT NOT NULL DEFAULT 'Standby',
            ContactPerson TEXT NOT NULL DEFAULT '',
            ContactNumber TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS EvacueeLogs (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            EvacuationCenterId INTEGER NOT NULL DEFAULT 0,
            ResidentId INTEGER NULL,
            EvacueeName TEXT NOT NULL DEFAULT '',
            Sitio TEXT NOT NULL DEFAULT '',
            Address TEXT NOT NULL DEFAULT '',
            HeadCount INTEGER NOT NULL DEFAULT 1,
            HasSenior INTEGER NOT NULL DEFAULT 0,
            HasPWD INTEGER NOT NULL DEFAULT 0,
            HasInfant INTEGER NOT NULL DEFAULT 0,
            HasPregnant INTEGER NOT NULL DEFAULT 0,
            Notes TEXT NOT NULL DEFAULT '',
            CheckedInAt TEXT NOT NULL DEFAULT '',
            CheckedOutAt TEXT NULL,
            Status TEXT NOT NULL DEFAULT 'Present',
            RecordedBy TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS ReliefLogs (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            DisasterName TEXT NOT NULL DEFAULT '',
            ResidentId INTEGER NULL,
            RecipientName TEXT NOT NULL DEFAULT '',
            Sitio TEXT NOT NULL DEFAULT '',
            Address TEXT NOT NULL DEFAULT '',
            ReliefItem TEXT NOT NULL DEFAULT '',
            Quantity INTEGER NOT NULL DEFAULT 1,
            Unit TEXT NOT NULL DEFAULT 'pack',
            DistributedBy TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT '',
            DistributedAt TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS Events (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Title TEXT NOT NULL DEFAULT '',
            EventType TEXT NOT NULL DEFAULT 'Meeting',
            Location TEXT NOT NULL DEFAULT '',
            StartTime TEXT NOT NULL DEFAULT '',
            EndTime TEXT NOT NULL DEFAULT '',
            Organizer TEXT NOT NULL DEFAULT '',
            Description TEXT NOT NULL DEFAULT '',
            Status TEXT NOT NULL DEFAULT 'Scheduled',
            BlotterId INTEGER NULL,
            BlotterCaseNumber TEXT NOT NULL DEFAULT '',
            Participants TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT '',
            CreatedBy TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS BudgetProjects (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            ProjectCode TEXT NOT NULL DEFAULT '',
            Title TEXT NOT NULL DEFAULT '',
            Category TEXT NOT NULL DEFAULT 'Other',
            Description TEXT NOT NULL DEFAULT '',
            FundSource TEXT NOT NULL DEFAULT 'Barangay Fund',
            AllocatedBudget REAL NOT NULL DEFAULT 0,
            ActualExpense REAL NOT NULL DEFAULT 0,
            Status TEXT NOT NULL DEFAULT 'Planned',
            StartDate TEXT NOT NULL DEFAULT '',
            EndDate TEXT NULL,
            ActualEndDate TEXT NULL,
            Implementor TEXT NOT NULL DEFAULT '',
            Beneficiaries TEXT NOT NULL DEFAULT '',
            BeneficiaryCount INTEGER NOT NULL DEFAULT 0,
            Location TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT '',
            CreatedBy TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS ProjectExpenses (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            ProjectId INTEGER NOT NULL DEFAULT 0,
            Description TEXT NOT NULL DEFAULT '',
            Category TEXT NOT NULL DEFAULT 'Other',
            Amount REAL NOT NULL DEFAULT 0,
            ExpenseDate TEXT NOT NULL DEFAULT '',
            RecordedBy TEXT NOT NULL DEFAULT '',
            ReceiptNo TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS DocumentVersions (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            DocumentId INTEGER NOT NULL DEFAULT 0,
            Version INTEGER NOT NULL DEFAULT 1,
            Action TEXT NOT NULL DEFAULT 'Issued',
            DocumentType TEXT NOT NULL DEFAULT '',
            Purpose TEXT NOT NULL DEFAULT '',
            IssuedBy TEXT NOT NULL DEFAULT '',
            ControlNumber TEXT NOT NULL DEFAULT '',
            ChangeNote TEXT NOT NULL DEFAULT '',
            ChangedBy TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS HealthRecords (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            ResidentId INTEGER NOT NULL DEFAULT 0,
            BloodType TEXT NOT NULL DEFAULT '',
            Allergies TEXT NOT NULL DEFAULT '',
            ChronicConditions TEXT NOT NULL DEFAULT '',
            Medications TEXT NOT NULL DEFAULT '',
            PhilHealthNo TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT '',
            UpdatedAt TEXT NOT NULL DEFAULT '',
            UpdatedBy TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS VaccinationRecords (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            ResidentId INTEGER NOT NULL DEFAULT 0,
            VaccineName TEXT NOT NULL DEFAULT '',
            DoseNumber TEXT NOT NULL DEFAULT '',
            DateGiven TEXT NOT NULL DEFAULT '',
            BatchNo TEXT NOT NULL DEFAULT '',
            AdministeredBy TEXT NOT NULL DEFAULT '',
            Venue TEXT NOT NULL DEFAULT '',
            NextDoseDate TEXT NULL,
            Notes TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS HealthWorkers (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL DEFAULT '',
            Role TEXT NOT NULL DEFAULT 'BHW',
            Sitio TEXT NOT NULL DEFAULT '',
            ContactNumber TEXT NOT NULL DEFAULT '',
            Qualifications TEXT NOT NULL DEFAULT '',
            IsActive INTEGER NOT NULL DEFAULT 1,
            AssignedSince TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS FamilyRelationships (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            ResidentId INTEGER NOT NULL DEFAULT 0,
            RelatedResidentId INTEGER NOT NULL DEFAULT 0,
            Role TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS SkillTags (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL DEFAULT '',
            Category TEXT NOT NULL DEFAULT 'Other',
            Description TEXT NOT NULL DEFAULT '',
            Color TEXT NOT NULL DEFAULT 'blue',
            ResidentCount INTEGER NOT NULL DEFAULT 0
        )",
        @"CREATE TABLE IF NOT EXISTS ResidentSkills (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            ResidentId INTEGER NOT NULL DEFAULT 0,
            SkillTagId INTEGER NOT NULL DEFAULT 0,
            ProficiencyLevel TEXT NOT NULL DEFAULT 'Intermediate',
            Notes TEXT NOT NULL DEFAULT '',
            IsAvailable INTEGER NOT NULL DEFAULT 1,
            TaggedAt TEXT NOT NULL DEFAULT '',
            TaggedBy TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS LivelihoodPrograms (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Title TEXT NOT NULL DEFAULT '',
            ProgramType TEXT NOT NULL DEFAULT 'Training',
            TargetSkills TEXT NOT NULL DEFAULT '',
            Description TEXT NOT NULL DEFAULT '',
            Organizer TEXT NOT NULL DEFAULT '',
            Venue TEXT NOT NULL DEFAULT '',
            StartDate TEXT NOT NULL DEFAULT '',
            EndDate TEXT NULL,
            SlotCount INTEGER NOT NULL DEFAULT 0,
            Status TEXT NOT NULL DEFAULT 'Upcoming',
            Notes TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT '',
            CreatedBy TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS Tasks (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Title TEXT NOT NULL DEFAULT '',
            Description TEXT NOT NULL DEFAULT '',
            Category TEXT NOT NULL DEFAULT 'General',
            Priority TEXT NOT NULL DEFAULT 'Normal',
            Status TEXT NOT NULL DEFAULT 'Pending',
            AssignedTo TEXT NOT NULL DEFAULT '',
            AssignedBy TEXT NOT NULL DEFAULT '',
            Location TEXT NOT NULL DEFAULT '',
            Sitio TEXT NOT NULL DEFAULT '',
            RelatedTo TEXT NOT NULL DEFAULT '',
            DueDate TEXT NULL,
            StartedAt TEXT NULL,
            CompletedAt TEXT NULL,
            CompletionNotes TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS BhwRecords (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            ResidentId INTEGER NOT NULL DEFAULT 0,
            Category TEXT NOT NULL DEFAULT '',
            Status TEXT NOT NULL DEFAULT 'Active',
            LmpDate TEXT NULL,
            EddDate TEXT NULL,
            GravidaPara INTEGER NOT NULL DEFAULT 0,
            RiskLevel TEXT NOT NULL DEFAULT 'Low',
            ImmunizationStatus TEXT NOT NULL DEFAULT '',
            NextImmunizationDate TEXT NOT NULL DEFAULT '',
            AssignedBhw TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT '',
            UpdatedAt TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS HouseVisitLogs (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            ResidentId INTEGER NOT NULL DEFAULT 0,
            BhwRecordId INTEGER NULL,
            VisitType TEXT NOT NULL DEFAULT 'Routine',
            VisitedBy TEXT NOT NULL DEFAULT '',
            VisitDate TEXT NOT NULL DEFAULT '',
            Findings TEXT NOT NULL DEFAULT '',
            ActionTaken TEXT NOT NULL DEFAULT '',
            NextVisitDate TEXT NOT NULL DEFAULT '',
            BloodPressure TEXT NOT NULL DEFAULT '',
            Weight TEXT NOT NULL DEFAULT '',
            Temperature TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT ''
        )",
        @"CREATE TABLE IF NOT EXISTS MedicineDistributions (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            ResidentId INTEGER NOT NULL DEFAULT 0,
            MedicineName TEXT NOT NULL DEFAULT '',
            Quantity TEXT NOT NULL DEFAULT '',
            Purpose TEXT NOT NULL DEFAULT '',
            DistributedBy TEXT NOT NULL DEFAULT '',
            Source TEXT NOT NULL DEFAULT '',
            DistributedAt TEXT NOT NULL DEFAULT '',
            NextPickupDate TEXT NOT NULL DEFAULT '',
            Notes TEXT NOT NULL DEFAULT '',
            CreatedAt TEXT NOT NULL DEFAULT ''
        )",
    };
    foreach (var sql in migrations)
    {
        try { using var cmd = conn.CreateCommand(); cmd.CommandText = sql; cmd.ExecuteNonQuery(); }
        catch { /* column already exists */ }
    }
    // Seed default skill tags if none exist
    if (!db.SkillTags.Any())
    {
        var defaultSkills = new[]
        {
            new SkillTag { Name="Carpenter",       Category="Trade",        Color="amber",  Description="Wood construction and furniture making" },
            new SkillTag { Name="Mason",            Category="Trade",        Color="amber",  Description="Concrete and masonry work" },
            new SkillTag { Name="Electrician",      Category="Trade",        Color="yellow", Description="Electrical installation and repair" },
            new SkillTag { Name="Plumber",          Category="Trade",        Color="blue",   Description="Plumbing installation and repair" },
            new SkillTag { Name="Welder",           Category="Trade",        Color="orange", Description="Metal welding and fabrication" },
            new SkillTag { Name="Driver",           Category="Service",      Color="green",  Description="Professional driving (motorcycle, tricycle, truck)" },
            new SkillTag { Name="Mechanic",         Category="Trade",        Color="gray",   Description="Vehicle and engine repair" },
            new SkillTag { Name="Farmer",           Category="Agriculture",  Color="green",  Description="Crop farming and cultivation" },
            new SkillTag { Name="Fisher",           Category="Agriculture",  Color="blue",   Description="Fishing and aquaculture" },
            new SkillTag { Name="Livestock Raiser", Category="Agriculture",  Color="green",  Description="Poultry, hog, cattle raising" },
            new SkillTag { Name="Dressmaker",       Category="Trade",        Color="pink",   Description="Sewing, tailoring, and garment making" },
            new SkillTag { Name="Cook / Baker",     Category="Service",      Color="orange", Description="Food preparation and baking" },
            new SkillTag { Name="Hairdresser",      Category="Service",      Color="pink",   Description="Hair cutting and styling" },
            new SkillTag { Name="Massage Therapist",Category="Service",      Color="purple", Description="Hilot and massage therapy" },
            new SkillTag { Name="Teacher / Tutor",  Category="Education",    Color="blue",   Description="Teaching and academic tutoring" },
            new SkillTag { Name="Computer Literate",Category="Tech",         Color="indigo", Description="Basic computer and internet skills" },
            new SkillTag { Name="Encoder / Clerk",  Category="Tech",         Color="indigo", Description="Data entry and office work" },
            new SkillTag { Name="Caregiver",        Category="Service",      Color="teal",   Description="Elderly and child care" },
            new SkillTag { Name="Security Guard",   Category="Service",      Color="gray",   Description="Security and guard duties" },
            new SkillTag { Name="Vendor / Trader",  Category="Service",      Color="green",  Description="Buy and sell, market vending" },
        };
        db.SkillTags.AddRange(defaultSkills);
        db.SaveChanges();
    }

    conn.Close();

    // Seed default admin if no users exist
    if (!db.Users.Any())
    {
        var hash = Convert.ToHexString(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes("admin123"))).ToLower();
        db.Users.Add(new BarangayAPI.Models.AppUser
        {
            Username = "admin",
            PasswordHash = hash,
            FullName = "System Administrator",
            Role = "Admin",
            IsActive = true
        });
        db.SaveChanges();
    }
}

app.UseCors();
app.MapControllers();

// Dashboard stats endpoint
app.MapGet("/api/stats", async (AppDbContext db) =>
{
    var now       = DateTime.UtcNow;
    var today     = now.Date;
    var thisMonth = new DateTime(now.Year, now.Month, 1);
    var thisYear  = new DateTime(now.Year, 1, 1);

    var seniorCutoff = now.AddYears(-60);
    var minorCutoff  = now.AddYears(-18);

    var recentResidents = await db.Residents
        .OrderByDescending(r => r.CreatedAt)
        .Take(5)
        .Select(r => new { r.FirstName, r.LastName, r.Address, r.Sitio, r.CreatedAt })
        .ToListAsync();

    var recentBlotters = await db.Blotters
        .OrderByDescending(b => b.FiledDate)
        .Take(5)
        .Select(b => new { b.CaseNumber, b.Complainant, b.Incident, b.Status, b.FiledDate })
        .ToListAsync();

    var docsByType = await db.Documents
        .GroupBy(d => d.DocumentType)
        .Select(g => new { Type = g.Key, Count = g.Count() })
        .ToListAsync();

    var blottersByStatus = await db.Blotters
        .GroupBy(b => b.Status)
        .Select(g => new { Status = g.Key, Count = g.Count() })
        .ToListAsync();

    var sitioBreakdown = await db.Residents
        .GroupBy(r => r.Sitio)
        .Select(g => new { Sitio = g.Key == "" ? "Unassigned" : g.Key, Count = g.Count() })
        .OrderBy(s => s.Sitio)
        .ToListAsync();

    // Today's live metrics
    var todayQueue    = await db.QueueRequests.CountAsync(q => q.RequestedAt.Date == today);
    var pendingQueue  = await db.QueueRequests.CountAsync(q => q.RequestedAt.Date == today && q.Status == "Pending");
    var todayPayments = await db.Payments.Where(p => p.PaidAt.Date == today && p.Status == "Paid").SumAsync(p => (double?)p.Amount) ?? 0;
    var newResidents  = await db.Residents.CountAsync(r => r.CreatedAt.Date == today);

    return new
    {
        TotalResidents  = await db.Residents.CountAsync(),
        TotalOfficials  = await db.Officials.CountAsync(o => o.IsActive),
        TotalDocuments  = await db.Documents.CountAsync(),
        PendingBlotters = await db.Blotters.CountAsync(b => b.Status == "Pending"),
        MaleResidents   = await db.Residents.CountAsync(r => r.Gender == "Male"),
        FemaleResidents = await db.Residents.CountAsync(r => r.Gender == "Female"),
        RegisteredVoters = await db.Residents.CountAsync(r => r.IsVoter),
        SeniorResidents = await db.Residents.CountAsync(r => r.IsSenior || r.BirthDate <= seniorCutoff),
        MinorResidents  = await db.Residents.CountAsync(r => r.BirthDate > minorCutoff),
        PwdResidents    = await db.Residents.CountAsync(r => r.IsPWD),
        FourPsResidents = await db.Residents.CountAsync(r => r.Is4Ps),
        DocsThisMonth   = await db.Documents.CountAsync(d => d.IssuedAt >= thisMonth),
        // Today live
        TodayQueueTotal    = todayQueue,
        TodayQueuePending  = pendingQueue,
        TodayCollections   = todayPayments,
        TodayNewResidents  = newResidents,
        // Month/year revenue
        MonthlyRevenue = await db.Payments.Where(p => p.PaidAt >= thisMonth && p.Status == "Paid").SumAsync(p => (double?)p.Amount) ?? 0,
        YearlyRevenue  = await db.Payments.Where(p => p.PaidAt >= thisYear  && p.Status == "Paid").SumAsync(p => (double?)p.Amount) ?? 0,
        RecentResidents  = recentResidents,
        RecentBlotters   = recentBlotters,
        DocsByType       = docsByType,
        BlottersByStatus = blottersByStatus,
        SitioBreakdown   = sitioBreakdown,
    };
});

// Reports endpoint — monthly breakdown for a given year
app.MapGet("/api/reports", async (AppDbContext db, [Microsoft.AspNetCore.Mvc.FromQuery] int? year) =>
{
    var y = year ?? DateTime.UtcNow.Year;

    var months = Enumerable.Range(1, 12).Select(m => new DateTime(y, m, 1)).ToList();

    var docsPerMonth = await db.Documents
        .Where(d => d.IssuedAt.Year == y)
        .GroupBy(d => d.IssuedAt.Month)
        .Select(g => new { Month = g.Key, Count = g.Count() })
        .ToListAsync();

    var revenuePerMonth = await db.Payments
        .Where(p => p.PaidAt.Year == y && p.Status == "Paid")
        .GroupBy(p => p.PaidAt.Month)
        .Select(g => new { Month = g.Key, Total = g.Sum(p => (double?)p.Amount) ?? 0 })
        .ToListAsync();

    var residentsPerMonth = await db.Residents
        .Where(r => r.CreatedAt.Year == y)
        .GroupBy(r => r.CreatedAt.Month)
        .Select(g => new { Month = g.Key, Count = g.Count() })
        .ToListAsync();

    var blottersPerMonth = await db.Blotters
        .Where(b => b.FiledDate.Year == y)
        .GroupBy(b => b.FiledDate.Month)
        .Select(g => new { Month = g.Key, Count = g.Count() })
        .ToListAsync();

    var docsByType = await db.Documents
        .Where(d => d.IssuedAt.Year == y)
        .GroupBy(d => d.DocumentType)
        .Select(g => new { Type = g.Key, Count = g.Count() })
        .OrderByDescending(g => g.Count)
        .ToListAsync();

    var revenueByCategory = await db.Payments
        .Where(p => p.PaidAt.Year == y && p.Status == "Paid")
        .GroupBy(p => p.Category)
        .Select(g => new { Category = g.Key, Total = g.Sum(p => (double?)p.Amount) ?? 0 })
        .OrderByDescending(g => g.Total)
        .ToListAsync();

    var monthNames = new[] { "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec" };

    var monthly = Enumerable.Range(1, 12).Select(m => new
    {
        Month        = monthNames[m - 1],
        Docs         = docsPerMonth.FirstOrDefault(x => x.Month == m)?.Count ?? 0,
        Revenue      = revenuePerMonth.FirstOrDefault(x => x.Month == m)?.Total ?? 0,
        NewResidents = residentsPerMonth.FirstOrDefault(x => x.Month == m)?.Count ?? 0,
        Blotters     = blottersPerMonth.FirstOrDefault(x => x.Month == m)?.Count ?? 0,
    }).ToList();

    return new
    {
        Year             = y,
        Monthly          = monthly,
        DocsByType       = docsByType,
        RevenueByCategory = revenueByCategory,
        TotalDocs        = docsPerMonth.Sum(x => x.Count),
        TotalRevenue     = revenuePerMonth.Sum(x => x.Total),
        TotalNewResidents = residentsPerMonth.Sum(x => x.Count),
        TotalBlotters    = blottersPerMonth.Sum(x => x.Count),
    };
});

// Household & Voter Mapping endpoint
app.MapGet("/api/households", async (AppDbContext db, [Microsoft.AspNetCore.Mvc.FromQuery] string? sitio) =>
{
    var query = db.Residents.AsQueryable();
    if (!string.IsNullOrWhiteSpace(sitio)) query = query.Where(r => r.Sitio == sitio);

    var residents = await query.OrderBy(r => r.Sitio).ThenBy(r => r.HouseholdNo).ThenBy(r => r.LastName).ToListAsync();
    var now = DateTime.UtcNow;

    // Group into households (by HouseholdNo + Sitio; blank HouseholdNo = own group per address)
    var grouped = residents
        .GroupBy(r => new {
            Sitio = string.IsNullOrWhiteSpace(r.Sitio) ? "Unassigned" : r.Sitio,
            HH    = string.IsNullOrWhiteSpace(r.HouseholdNo) ? $"(No HH#) {r.Address}" : r.HouseholdNo,
        })
        .Select(g => new {
            Sitio          = g.Key.Sitio,
            HouseholdNo    = g.Key.HH,
            RawHouseholdNo = g.First().HouseholdNo,   // actual DB value (may be empty)
            Address        = g.First().Address,
            Members     = g.Select(r => new {
                r.Id, r.FirstName, r.LastName, r.MiddleName, r.BirthDate,
                r.Gender, r.CivilStatus, r.Occupation,
                r.IsVoter, r.IsSenior, r.IsPWD, r.Is4Ps,
                Age = (int)((now - r.BirthDate).TotalDays / 365.25),
            }).ToList(),
            TotalMembers = g.Count(),
            Voters       = g.Count(r => r.IsVoter),
            Seniors      = g.Count(r => r.IsSenior || r.BirthDate <= now.AddYears(-60)),
            Minors       = g.Count(r => r.BirthDate > now.AddYears(-18)),
            PWD          = g.Count(r => r.IsPWD),
            FourPs       = g.Count(r => r.Is4Ps),
        })
        .OrderBy(h => h.Sitio).ThenBy(h => h.HouseholdNo)
        .ToList();

    // Sitio-level summary
    var sitioSummary = grouped
        .GroupBy(h => h.Sitio)
        .Select(g => new {
            Sitio      = g.Key,
            Households = g.Count(),
            Population = g.Sum(h => h.TotalMembers),
            Voters     = g.Sum(h => h.Voters),
            Seniors    = g.Sum(h => h.Seniors),
            Minors     = g.Sum(h => h.Minors),
            PWD        = g.Sum(h => h.PWD),
            FourPs     = g.Sum(h => h.FourPs),
        }).ToList();

    return new { Households = grouped, SitioSummary = sitioSummary };
});

// ── Emergency Module ──────────────────────────────────────────────────────────

// Vulnerable residents list
app.MapGet("/api/emergency/vulnerable", async (AppDbContext db) =>
{
    var now = DateTime.UtcNow;
    var seniorCutoff = now.AddYears(-60);
    var minorCutoff  = now.AddYears(-18);

    var residents = await db.Residents.ToListAsync();
    var vulnerable = residents
        .Where(r => r.IsSenior || r.BirthDate <= seniorCutoff || r.IsPWD || r.BirthDate > minorCutoff)
        .Select(r => new {
            r.Id, r.FirstName, r.LastName, r.MiddleName,
            r.BirthDate, r.Gender, r.Sitio, r.Address, r.HouseholdNo,
            r.ContactNumber, r.IsSenior, r.IsPWD, r.Is4Ps,
            Age = (int)((now - r.BirthDate).TotalDays / 365.25),
            IsMinor = r.BirthDate > minorCutoff,
        })
        .OrderBy(r => r.Sitio).ThenBy(r => r.LastName)
        .ToList();

    var summary = new {
        Total    = vulnerable.Count,
        Seniors  = vulnerable.Count(r => r.IsSenior || r.Age >= 60),
        PWD      = vulnerable.Count(r => r.IsPWD),
        Minors   = vulnerable.Count(r => r.IsMinor),
        FourPs   = vulnerable.Count(r => r.Is4Ps),
    };

    return new { Vulnerable = vulnerable, Summary = summary };
});

// Evacuation Centers CRUD
app.MapGet("/api/emergency/centers", async (AppDbContext db) =>
    await db.EvacuationCenters.OrderBy(c => c.Name).ToListAsync());

app.MapPost("/api/emergency/centers", async (AppDbContext db, EvacuationCenter body) =>
{
    body.CreatedAt = DateTime.UtcNow;
    db.EvacuationCenters.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapPut("/api/emergency/centers/{id}", async (AppDbContext db, int id, EvacuationCenter body) =>
{
    var c = await db.EvacuationCenters.FindAsync(id);
    if (c is null) return Results.NotFound();
    c.Name = body.Name; c.Location = body.Location; c.Sitio = body.Sitio;
    c.Capacity = body.Capacity; c.Status = body.Status;
    c.ContactPerson = body.ContactPerson; c.ContactNumber = body.ContactNumber;
    c.Notes = body.Notes;
    await db.SaveChangesAsync();
    return Results.Ok(c);
});

app.MapDelete("/api/emergency/centers/{id}", async (AppDbContext db, int id) =>
{
    var c = await db.EvacuationCenters.FindAsync(id);
    if (c is null) return Results.NotFound();
    db.EvacuationCenters.Remove(c);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// Evacuee Logs
app.MapGet("/api/emergency/evacuees", async (AppDbContext db, [Microsoft.AspNetCore.Mvc.FromQuery] int? centerId) =>
{
    var q = db.EvacueeLogs.AsQueryable();
    if (centerId.HasValue) q = q.Where(e => e.EvacuationCenterId == centerId.Value);
    var logs = await q.OrderByDescending(e => e.CheckedInAt).ToListAsync();

    // Attach center names
    var centers = await db.EvacuationCenters.ToListAsync();
    var result = logs.Select(e => new {
        e.Id, e.EvacuationCenterId,
        CenterName = centers.FirstOrDefault(c => c.Id == e.EvacuationCenterId)?.Name ?? "",
        e.ResidentId, e.EvacueeName, e.Sitio, e.Address, e.HeadCount,
        e.HasSenior, e.HasPWD, e.HasInfant, e.HasPregnant,
        e.Notes, e.CheckedInAt, e.CheckedOutAt, e.Status, e.RecordedBy,
    });
    return Results.Ok(result);
});

app.MapPost("/api/emergency/evacuees", async (AppDbContext db, EvacueeLog body) =>
{
    // Auto-fill name from resident if linked
    if (body.ResidentId.HasValue && string.IsNullOrWhiteSpace(body.EvacueeName))
    {
        var r = await db.Residents.FindAsync(body.ResidentId.Value);
        if (r != null)
        {
            body.EvacueeName = $"{r.LastName}, {r.FirstName}";
            body.Sitio = r.Sitio;
            body.Address = r.Address;
            body.HasSenior = r.IsSenior;
            body.HasPWD = r.IsPWD;
        }
    }
    body.CheckedInAt = DateTime.UtcNow;
    body.Status = "Present";
    db.EvacueeLogs.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapPatch("/api/emergency/evacuees/{id}/checkout", async (AppDbContext db, int id) =>
{
    var e = await db.EvacueeLogs.FindAsync(id);
    if (e is null) return Results.NotFound();
    e.CheckedOutAt = DateTime.UtcNow;
    e.Status = "Departed";
    await db.SaveChangesAsync();
    return Results.Ok(e);
});

app.MapDelete("/api/emergency/evacuees/{id}", async (AppDbContext db, int id) =>
{
    var e = await db.EvacueeLogs.FindAsync(id);
    if (e is null) return Results.NotFound();
    db.EvacueeLogs.Remove(e);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// Relief Logs
app.MapGet("/api/emergency/relief", async (AppDbContext db, [Microsoft.AspNetCore.Mvc.FromQuery] string? disaster) =>
{
    var q = db.ReliefLogs.AsQueryable();
    if (!string.IsNullOrWhiteSpace(disaster)) q = q.Where(r => r.DisasterName == disaster);
    return await q.OrderByDescending(r => r.DistributedAt).ToListAsync();
});

app.MapGet("/api/emergency/relief/disasters", async (AppDbContext db) =>
    await db.ReliefLogs.Select(r => r.DisasterName).Distinct().OrderByDescending(d => d).ToListAsync());

app.MapPost("/api/emergency/relief", async (AppDbContext db, ReliefLog body) =>
{
    if (body.ResidentId.HasValue && string.IsNullOrWhiteSpace(body.RecipientName))
    {
        var r = await db.Residents.FindAsync(body.ResidentId.Value);
        if (r != null)
        {
            body.RecipientName = $"{r.LastName}, {r.FirstName}";
            body.Sitio = r.Sitio;
            body.Address = r.Address;
        }
    }
    body.DistributedAt = DateTime.UtcNow;
    db.ReliefLogs.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapDelete("/api/emergency/relief/{id}", async (AppDbContext db, int id) =>
{
    var r = await db.ReliefLogs.FindAsync(id);
    if (r is null) return Results.NotFound();
    db.ReliefLogs.Remove(r);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// ── Events & Appointments ─────────────────────────────────────────────────────

app.MapGet("/api/events", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] int? year,
    [Microsoft.AspNetCore.Mvc.FromQuery] int? month,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? type,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? status) =>
{
    var q = db.Events.AsQueryable();
    if (year.HasValue)  q = q.Where(e => e.StartTime.Year  == year.Value);
    if (month.HasValue) q = q.Where(e => e.StartTime.Month == month.Value);
    if (!string.IsNullOrWhiteSpace(type))   q = q.Where(e => e.EventType == type);
    if (!string.IsNullOrWhiteSpace(status)) q = q.Where(e => e.Status == status);
    return await q.OrderBy(e => e.StartTime).ToListAsync();
});

app.MapGet("/api/events/upcoming", async (AppDbContext db) =>
{
    var now = DateTime.UtcNow;
    return await db.Events
        .Where(e => e.StartTime >= now && e.Status == "Scheduled")
        .OrderBy(e => e.StartTime)
        .Take(10)
        .ToListAsync();
});

// Conflict check: returns events that overlap with the proposed time slot (excluding given id)
app.MapGet("/api/events/conflicts", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] string start,
    [Microsoft.AspNetCore.Mvc.FromQuery] string end,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? location,
    [Microsoft.AspNetCore.Mvc.FromQuery] int? excludeId) =>
{
    if (!DateTime.TryParse(start, out var s) || !DateTime.TryParse(end, out var e))
        return Results.BadRequest("Invalid date format");

    var q = db.Events.Where(ev =>
        ev.Status != "Cancelled" &&
        ev.StartTime < e && ev.EndTime > s);

    if (!string.IsNullOrWhiteSpace(location))
        q = q.Where(ev => ev.Location.ToLower() == location.ToLower());

    if (excludeId.HasValue)
        q = q.Where(ev => ev.Id != excludeId.Value);

    return Results.Ok(await q.OrderBy(ev => ev.StartTime).ToListAsync());
});

app.MapPost("/api/events", async (AppDbContext db, BarangayEvent body) =>
{
    body.CreatedAt = DateTime.UtcNow;
    // Auto-mark past events as Done on creation (edge case guard)
    if (body.EndTime < DateTime.UtcNow && body.Status == "Scheduled")
        body.Status = "Done";
    db.Events.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapPut("/api/events/{id}", async (AppDbContext db, int id, BarangayEvent body) =>
{
    var ev = await db.Events.FindAsync(id);
    if (ev is null) return Results.NotFound();
    ev.Title = body.Title; ev.EventType = body.EventType; ev.Location = body.Location;
    ev.StartTime = body.StartTime; ev.EndTime = body.EndTime;
    ev.Organizer = body.Organizer; ev.Description = body.Description;
    ev.Status = body.Status; ev.BlotterId = body.BlotterId;
    ev.BlotterCaseNumber = body.BlotterCaseNumber;
    ev.Participants = body.Participants;
    await db.SaveChangesAsync();
    return Results.Ok(ev);
});

app.MapPatch("/api/events/{id}/status", async (AppDbContext db, int id, [Microsoft.AspNetCore.Mvc.FromBody] string newStatus) =>
{
    var ev = await db.Events.FindAsync(id);
    if (ev is null) return Results.NotFound();
    ev.Status = newStatus;
    await db.SaveChangesAsync();
    return Results.Ok(ev);
});

app.MapDelete("/api/events/{id}", async (AppDbContext db, int id) =>
{
    var ev = await db.Events.FindAsync(id);
    if (ev is null) return Results.NotFound();
    db.Events.Remove(ev);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// ── GIS Map ───────────────────────────────────────────────────────────────────

app.MapGet("/api/map/sitios", async (AppDbContext db, [Microsoft.AspNetCore.Mvc.FromQuery] string? layer) =>
{
    var now = DateTime.UtcNow;
    var seniorCutoff = now.AddYears(-60);
    var minorCutoff  = now.AddYears(-18);

    var residents = await db.Residents.ToListAsync();

    var sitioData = residents
        .GroupBy(r => string.IsNullOrWhiteSpace(r.Sitio) ? "Unassigned" : r.Sitio)
        .Select(g => new {
            Sitio      = g.Key,
            Total      = g.Count(),
            Voters     = g.Count(r => r.IsVoter),
            Seniors    = g.Count(r => r.IsSenior || r.BirthDate <= seniorCutoff),
            PWD        = g.Count(r => r.IsPWD),
            FourPs     = g.Count(r => r.Is4Ps),
            Minors     = g.Count(r => r.BirthDate > minorCutoff),
            Vulnerable = g.Count(r => r.IsSenior || r.BirthDate <= seniorCutoff || r.IsPWD || r.BirthDate > minorCutoff),
            Households = g.Select(r => r.HouseholdNo).Where(h => !string.IsNullOrWhiteSpace(h)).Distinct().Count(),
        })
        .OrderBy(s => s.Sitio)
        .ToList();

    return Results.Ok(sitioData);
});

// ── Budget & Project Tracking ─────────────────────────────────────────────────

app.MapGet("/api/budget/projects", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? status,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? category,
    [Microsoft.AspNetCore.Mvc.FromQuery] int? year) =>
{
    var q = db.BudgetProjects.AsQueryable();
    if (!string.IsNullOrWhiteSpace(status))   q = q.Where(p => p.Status == status);
    if (!string.IsNullOrWhiteSpace(category)) q = q.Where(p => p.Category == category);
    if (year.HasValue) q = q.Where(p => p.StartDate.Year == year.Value);
    return await q.OrderByDescending(p => p.CreatedAt).ToListAsync();
});

app.MapGet("/api/budget/projects/{id}", async (AppDbContext db, int id) =>
{
    var p = await db.BudgetProjects.FindAsync(id);
    if (p is null) return Results.NotFound();
    var expenses = await db.ProjectExpenses.Where(e => e.ProjectId == id).OrderByDescending(e => e.ExpenseDate).ToListAsync();
    return Results.Ok(new { Project = p, Expenses = expenses });
});

app.MapPost("/api/budget/projects", async (AppDbContext db, BudgetProject body) =>
{
    body.CreatedAt = DateTime.UtcNow;
    // Auto-generate project code: PRJ-YYYY-NNN
    var count = await db.BudgetProjects.CountAsync();
    body.ProjectCode = $"PRJ-{DateTime.UtcNow.Year}-{(count + 1):D3}";
    db.BudgetProjects.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapPut("/api/budget/projects/{id}", async (AppDbContext db, int id, BudgetProject body) =>
{
    var p = await db.BudgetProjects.FindAsync(id);
    if (p is null) return Results.NotFound();
    p.Title = body.Title; p.Category = body.Category; p.Description = body.Description;
    p.FundSource = body.FundSource; p.AllocatedBudget = body.AllocatedBudget;
    p.Status = body.Status; p.StartDate = body.StartDate; p.EndDate = body.EndDate;
    p.ActualEndDate = body.ActualEndDate; p.Implementor = body.Implementor;
    p.Beneficiaries = body.Beneficiaries; p.BeneficiaryCount = body.BeneficiaryCount;
    p.Location = body.Location; p.Notes = body.Notes;
    await db.SaveChangesAsync();
    return Results.Ok(p);
});

app.MapDelete("/api/budget/projects/{id}", async (AppDbContext db, int id) =>
{
    var p = await db.BudgetProjects.FindAsync(id);
    if (p is null) return Results.NotFound();
    db.ProjectExpenses.RemoveRange(db.ProjectExpenses.Where(e => e.ProjectId == id));
    db.BudgetProjects.Remove(p);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// Expenses
app.MapGet("/api/budget/projects/{id}/expenses", async (AppDbContext db, int id) =>
    await db.ProjectExpenses.Where(e => e.ProjectId == id).OrderByDescending(e => e.ExpenseDate).ToListAsync());

app.MapPost("/api/budget/projects/{id}/expenses", async (AppDbContext db, int id, ProjectExpense body) =>
{
    body.ProjectId = id;
    body.ExpenseDate = body.ExpenseDate == default ? DateTime.UtcNow : body.ExpenseDate;
    db.ProjectExpenses.Add(body);
    // Update actual expense total on project
    var project = await db.BudgetProjects.FindAsync(id);
    if (project != null)
    {
        project.ActualExpense = await db.ProjectExpenses.Where(e => e.ProjectId == id).SumAsync(e => (double?)e.Amount) ?? 0;
        project.ActualExpense += body.Amount;
    }
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapDelete("/api/budget/expenses/{id}", async (AppDbContext db, int id) =>
{
    var e = await db.ProjectExpenses.FindAsync(id);
    if (e is null) return Results.NotFound();
    var projectId = e.ProjectId;
    db.ProjectExpenses.Remove(e);
    await db.SaveChangesAsync();
    // Recalculate actual expense
    var project = await db.BudgetProjects.FindAsync(projectId);
    if (project != null)
    {
        project.ActualExpense = await db.ProjectExpenses.Where(x => x.ProjectId == projectId).SumAsync(x => (double?)x.Amount) ?? 0;
        await db.SaveChangesAsync();
    }
    return Results.Ok();
});

// Budget summary
app.MapGet("/api/budget/summary", async (AppDbContext db, [Microsoft.AspNetCore.Mvc.FromQuery] int? year) =>
{
    var y = year ?? DateTime.UtcNow.Year;
    var projects = await db.BudgetProjects.Where(p => p.StartDate.Year == y).ToListAsync();

    var byCategory = projects
        .GroupBy(p => p.Category)
        .Select(g => new {
            Category  = g.Key,
            Count     = g.Count(),
            Allocated = g.Sum(p => p.AllocatedBudget),
            Spent     = g.Sum(p => p.ActualExpense),
        }).OrderByDescending(x => x.Allocated).ToList();

    var byStatus = projects
        .GroupBy(p => p.Status)
        .Select(g => new { Status = g.Key, Count = g.Count() })
        .ToList();

    return new {
        Year           = y,
        TotalProjects  = projects.Count,
        TotalAllocated = projects.Sum(p => p.AllocatedBudget),
        TotalSpent     = projects.Sum(p => p.ActualExpense),
        ByCategory     = byCategory,
        ByStatus       = byStatus,
        OngoingCount   = projects.Count(p => p.Status == "Ongoing"),
        CompletedCount = projects.Count(p => p.Status == "Completed"),
        PlannedCount   = projects.Count(p => p.Status == "Planned"),
    };
});

// ── Livelihood & Skills Registry ─────────────────────────────────────────────

// Skill tags CRUD
app.MapGet("/api/livelihood/skills", async (AppDbContext db) =>
    await db.SkillTags.OrderBy(s => s.Category).ThenBy(s => s.Name).ToListAsync());

app.MapPost("/api/livelihood/skills", async (AppDbContext db, SkillTag body) =>
{
    db.SkillTags.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapPut("/api/livelihood/skills/{id}", async (AppDbContext db, int id, SkillTag body) =>
{
    var s = await db.SkillTags.FindAsync(id);
    if (s is null) return Results.NotFound();
    s.Name = body.Name; s.Category = body.Category;
    s.Description = body.Description; s.Color = body.Color;
    await db.SaveChangesAsync();
    return Results.Ok(s);
});

app.MapDelete("/api/livelihood/skills/{id}", async (AppDbContext db, int id) =>
{
    var s = await db.SkillTags.FindAsync(id);
    if (s is null) return Results.NotFound();
    db.SkillTags.Remove(s);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// Residents with their skills (full directory)
app.MapGet("/api/livelihood/residents", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] int? skillId,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? sitio,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? available,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? search) =>
{
    var now = DateTime.UtcNow;

    // Get all resident skills with skill tag info
    var rsQuery = db.ResidentSkills.AsQueryable();
    if (skillId.HasValue) rsQuery = rsQuery.Where(rs => rs.SkillTagId == skillId.Value);
    if (available == "true") rsQuery = rsQuery.Where(rs => rs.IsAvailable);
    var allRS = await rsQuery.ToListAsync();

    var skillTagMap = (await db.SkillTags.ToListAsync()).ToDictionary(s => s.Id);
    var residentIds = allRS.Select(rs => rs.ResidentId).Distinct().ToList();

    var resQuery = db.Residents.Where(r => residentIds.Contains(r.Id));
    if (!string.IsNullOrWhiteSpace(sitio)) resQuery = resQuery.Where(r => r.Sitio == sitio);
    if (!string.IsNullOrWhiteSpace(search))
    {
        var q = search.ToLower();
        resQuery = resQuery.Where(r => (r.FirstName + " " + r.LastName).ToLower().Contains(q));
    }
    var residents = await resQuery.OrderBy(r => r.LastName).ToListAsync();

    var result = residents.Select(r =>
    {
        var mySkills = allRS.Where(rs => rs.ResidentId == r.Id).Select(rs => new
        {
            id = rs.Id,
            skillTagId = rs.SkillTagId,
            skillName = skillTagMap.TryGetValue(rs.SkillTagId, out var st) ? st.Name : "Unknown",
            skillCategory = skillTagMap.TryGetValue(rs.SkillTagId, out var st2) ? st2.Category : "",
            skillColor = skillTagMap.TryGetValue(rs.SkillTagId, out var st3) ? st3.Color : "gray",
            rs.ProficiencyLevel,
            rs.IsAvailable,
            rs.Notes,
            rs.TaggedAt,
            rs.TaggedBy,
        }).ToList();
        var age = r.BirthDate != default ? (int?)((now - r.BirthDate).TotalDays / 365.25) : null;
        return new
        {
            r.Id, r.FirstName, r.LastName, r.MiddleName,
            r.Gender, r.Sitio, r.Address, r.ContactNumber,
            r.Occupation, r.IsVoter, r.IsSenior, r.IsPWD, r.Is4Ps,
            age, skills = mySkills,
        };
    }).ToList();

    return Results.Ok(result);
});

// Tag a skill to a resident
app.MapPost("/api/livelihood/residents/{residentId}/skills", async (AppDbContext db, int residentId, ResidentSkill body) =>
{
    // Prevent duplicate skill tag on same resident
    var exists = await db.ResidentSkills.AnyAsync(rs => rs.ResidentId == residentId && rs.SkillTagId == body.SkillTagId);
    if (exists) return Results.Conflict("Resident already has this skill.");
    body.ResidentId = residentId;
    body.TaggedAt = DateTime.UtcNow;
    db.ResidentSkills.Add(body);
    // Update denormalized count
    var tag = await db.SkillTags.FindAsync(body.SkillTagId);
    if (tag != null) tag.ResidentCount = await db.ResidentSkills.CountAsync(rs => rs.SkillTagId == body.SkillTagId) + 1;
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

// Update a resident skill (proficiency, availability, notes)
app.MapPut("/api/livelihood/resident-skills/{id}", async (AppDbContext db, int id, ResidentSkill body) =>
{
    var rs = await db.ResidentSkills.FindAsync(id);
    if (rs is null) return Results.NotFound();
    rs.ProficiencyLevel = body.ProficiencyLevel;
    rs.IsAvailable = body.IsAvailable;
    rs.Notes = body.Notes;
    await db.SaveChangesAsync();
    return Results.Ok(rs);
});

// Remove a skill from a resident
app.MapDelete("/api/livelihood/resident-skills/{id}", async (AppDbContext db, int id) =>
{
    var rs = await db.ResidentSkills.FindAsync(id);
    if (rs is null) return Results.NotFound();
    var skillTagId = rs.SkillTagId;
    db.ResidentSkills.Remove(rs);
    await db.SaveChangesAsync();
    // Update count
    var tag = await db.SkillTags.FindAsync(skillTagId);
    if (tag != null) { tag.ResidentCount = await db.ResidentSkills.CountAsync(x => x.SkillTagId == skillTagId); await db.SaveChangesAsync(); }
    return Results.Ok();
});

// Skills summary — count per skill, for dashboard
app.MapGet("/api/livelihood/summary", async (AppDbContext db) =>
{
    var tags = await db.SkillTags.ToListAsync();
    var counts = await db.ResidentSkills
        .GroupBy(rs => rs.SkillTagId)
        .Select(g => new { SkillTagId = g.Key, Count = g.Count(), Available = g.Count(rs => rs.IsAvailable) })
        .ToListAsync();
    var byCategory = tags
        .GroupBy(t => t.Category)
        .Select(g => new { category = g.Key, count = g.Count() })
        .OrderBy(x => x.category).ToList();
    var skillSummary = tags.Select(t =>
    {
        var c = counts.FirstOrDefault(x => x.SkillTagId == t.Id);
        return new { t.Id, t.Name, t.Category, t.Color, t.Description, count = c?.Count ?? 0, available = c?.Available ?? 0 };
    }).OrderByDescending(x => x.count).ToList();
    return Results.Ok(new
    {
        totalTagged = counts.Sum(c => c.Count),
        totalAvailable = counts.Sum(c => c.Available),
        totalSkills = tags.Count,
        byCategory,
        skills = skillSummary,
    });
});

// Livelihood programs CRUD
app.MapGet("/api/livelihood/programs", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? status,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? type) =>
{
    var q = db.LivelihoodPrograms.AsQueryable();
    if (!string.IsNullOrWhiteSpace(status)) q = q.Where(p => p.Status == status);
    if (!string.IsNullOrWhiteSpace(type))   q = q.Where(p => p.ProgramType == type);
    return await q.OrderByDescending(p => p.StartDate).ToListAsync();
});

app.MapPost("/api/livelihood/programs", async (AppDbContext db, LivelihoodProgram body) =>
{
    body.CreatedAt = DateTime.UtcNow;
    db.LivelihoodPrograms.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapPut("/api/livelihood/programs/{id}", async (AppDbContext db, int id, LivelihoodProgram body) =>
{
    var p = await db.LivelihoodPrograms.FindAsync(id);
    if (p is null) return Results.NotFound();
    p.Title = body.Title; p.ProgramType = body.ProgramType; p.TargetSkills = body.TargetSkills;
    p.Description = body.Description; p.Organizer = body.Organizer; p.Venue = body.Venue;
    p.StartDate = body.StartDate; p.EndDate = body.EndDate; p.SlotCount = body.SlotCount;
    p.Status = body.Status; p.Notes = body.Notes;
    await db.SaveChangesAsync();
    return Results.Ok(p);
});

app.MapDelete("/api/livelihood/programs/{id}", async (AppDbContext db, int id) =>
{
    var p = await db.LivelihoodPrograms.FindAsync(id);
    if (p is null) return Results.NotFound();
    db.LivelihoodPrograms.Remove(p);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// ── Relief Intelligence ───────────────────────────────────────────────────────

// Summary stats for a disaster: total recipients, items breakdown, sitio breakdown, double-claim check
app.MapGet("/api/emergency/relief/summary", async (AppDbContext db, [Microsoft.AspNetCore.Mvc.FromQuery] string disaster) =>
{
    if (string.IsNullOrWhiteSpace(disaster)) return Results.BadRequest("disaster is required");

    var logs = await db.ReliefLogs.Where(r => r.DisasterName == disaster).ToListAsync();

    var byItem = logs.GroupBy(r => r.ReliefItem)
        .Select(g => new { item = g.Key, recipients = g.Count(), totalQty = g.Sum(x => x.Quantity) })
        .OrderByDescending(x => x.recipients).ToList();

    var bySitio = logs.GroupBy(r => r.Sitio)
        .Select(g => new { sitio = g.Key, recipients = g.Count() })
        .OrderByDescending(x => x.recipients).ToList();

    // Residents who received more than once (double claims)
    var doubleClaims = logs
        .Where(r => r.ResidentId.HasValue)
        .GroupBy(r => r.ResidentId)
        .Where(g => g.Count() > 1)
        .Select(g => new { residentId = g.Key, count = g.Count(), name = g.First().RecipientName })
        .ToList();

    return Results.Ok(new {
        disaster,
        totalLogs       = logs.Count,
        uniqueRecipients = logs.Where(r => r.ResidentId.HasValue).Select(r => r.ResidentId).Distinct().Count(),
        unlinkedLogs    = logs.Count(r => !r.ResidentId.HasValue),
        byItem,
        bySitio,
        doubleClaims,
    });
});

// Coverage: all residents vs who already received aid for a given disaster
app.MapGet("/api/emergency/relief/coverage", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] string disaster,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? sitio,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? item) =>
{
    if (string.IsNullOrWhiteSpace(disaster)) return Results.BadRequest("disaster is required");

    var now = DateTime.UtcNow;
    var seniorCutoff = now.AddYears(-60);
    var minorCutoff  = now.AddYears(-18);

    var resQuery = db.Residents.AsQueryable();
    if (!string.IsNullOrWhiteSpace(sitio)) resQuery = resQuery.Where(r => r.Sitio == sitio);
    var allResidents = await resQuery.OrderBy(r => r.Sitio).ThenBy(r => r.LastName).ToListAsync();

    // Logs for this disaster (optionally filtered by item)
    var logsQuery = db.ReliefLogs.Where(r => r.DisasterName == disaster);
    if (!string.IsNullOrWhiteSpace(item)) logsQuery = logsQuery.Where(r => r.ReliefItem == item);
    var logs = await logsQuery.ToListAsync();

    var claimedIds = logs.Where(r => r.ResidentId.HasValue).Select(r => r.ResidentId!.Value).ToHashSet();

    var claimed = allResidents
        .Where(r => claimedIds.Contains(r.Id))
        .Select(r => new {
            r.Id, r.FirstName, r.LastName, r.MiddleName,
            r.Sitio, r.Address, r.HouseholdNo, r.ContactNumber,
            r.IsSenior, r.IsPWD, r.Is4Ps,
            isMinor = r.BirthDate > minorCutoff,
            age = r.BirthDate != default ? (int?)((now - r.BirthDate).TotalDays / 365.25) : null,
            logs = logs.Where(l => l.ResidentId == r.Id)
                .Select(l => new { l.ReliefItem, l.Quantity, l.Unit, l.DistributedAt, l.DistributedBy })
                .ToList(),
        }).ToList();

    var unclaimed = allResidents
        .Where(r => !claimedIds.Contains(r.Id))
        .Select(r => new {
            r.Id, r.FirstName, r.LastName, r.MiddleName,
            r.Sitio, r.Address, r.HouseholdNo, r.ContactNumber,
            r.IsSenior, r.IsPWD, r.Is4Ps,
            isMinor = r.BirthDate > minorCutoff,
            age = r.BirthDate != default ? (int?)((now - r.BirthDate).TotalDays / 365.25) : null,
        }).ToList();

    return Results.Ok(new {
        disaster,
        totalResidents  = allResidents.Count,
        claimedCount    = claimed.Count,
        unclaimedCount  = unclaimed.Count,
        coveragePct     = allResidents.Count > 0 ? Math.Round((double)claimed.Count / allResidents.Count * 100, 1) : 0,
        claimed,
        unclaimed,
    });
});

// Check if a resident already received a specific item for a disaster (double-claim guard)
app.MapGet("/api/emergency/relief/check", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] int residentId,
    [Microsoft.AspNetCore.Mvc.FromQuery] string disaster,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? item) =>
{
    var q = db.ReliefLogs.Where(r => r.ResidentId == residentId && r.DisasterName == disaster);
    if (!string.IsNullOrWhiteSpace(item)) q = q.Where(r => r.ReliefItem == item);
    var existing = await q.ToListAsync();
    return Results.Ok(new {
        alreadyClaimed = existing.Any(),
        count = existing.Count,
        logs = existing.Select(l => new { l.ReliefItem, l.Quantity, l.Unit, l.DistributedAt, l.DistributedBy }),
    });
});

// ── Task Assignment ───────────────────────────────────────────────────────────

app.MapGet("/api/tasks", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? status,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? assignedTo,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? priority,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? category) =>
{
    var q = db.Tasks.AsQueryable();
    if (!string.IsNullOrWhiteSpace(status))     q = q.Where(t => t.Status == status);
    if (!string.IsNullOrWhiteSpace(assignedTo)) q = q.Where(t => t.AssignedTo == assignedTo);
    if (!string.IsNullOrWhiteSpace(priority))   q = q.Where(t => t.Priority == priority);
    if (!string.IsNullOrWhiteSpace(category))   q = q.Where(t => t.Category == category);
    return await q.OrderByDescending(t => t.CreatedAt).ToListAsync();
});

app.MapGet("/api/tasks/{id}", async (AppDbContext db, int id) =>
{
    var t = await db.Tasks.FindAsync(id);
    return t is null ? Results.NotFound() : Results.Ok(t);
});

app.MapPost("/api/tasks", async (AppDbContext db, TaskAssignment body) =>
{
    body.CreatedAt = DateTime.UtcNow;
    db.Tasks.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapPut("/api/tasks/{id}", async (AppDbContext db, int id, TaskAssignment body) =>
{
    var t = await db.Tasks.FindAsync(id);
    if (t is null) return Results.NotFound();
    t.Title = body.Title; t.Description = body.Description; t.Category = body.Category;
    t.Priority = body.Priority; t.AssignedTo = body.AssignedTo; t.AssignedBy = body.AssignedBy;
    t.Location = body.Location; t.Sitio = body.Sitio; t.RelatedTo = body.RelatedTo;
    t.DueDate = body.DueDate; t.Notes = body.Notes;
    await db.SaveChangesAsync();
    return Results.Ok(t);
});

// Patch status only (start / complete / cancel)
app.MapPatch("/api/tasks/{id}/status", async (AppDbContext db, int id, TaskStatusPatch body) =>
{
    var t = await db.Tasks.FindAsync(id);
    if (t is null) return Results.NotFound();
    t.Status = body.Status;
    if (body.Status == "In Progress" && t.StartedAt is null) t.StartedAt = DateTime.UtcNow;
    if (body.Status == "Done") { t.CompletedAt = DateTime.UtcNow; t.CompletionNotes = body.CompletionNotes ?? ""; }
    await db.SaveChangesAsync();
    return Results.Ok(t);
});

app.MapDelete("/api/tasks/{id}", async (AppDbContext db, int id) =>
{
    var t = await db.Tasks.FindAsync(id);
    if (t is null) return Results.NotFound();
    db.Tasks.Remove(t);
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapGet("/api/tasks/summary", async (AppDbContext db) =>
{
    var all = await db.Tasks.ToListAsync();
    var now = DateTime.UtcNow;
    return Results.Ok(new {
        total      = all.Count,
        pending    = all.Count(t => t.Status == "Pending"),
        inProgress = all.Count(t => t.Status == "In Progress"),
        done       = all.Count(t => t.Status == "Done"),
        cancelled  = all.Count(t => t.Status == "Cancelled"),
        overdue    = all.Count(t => t.DueDate.HasValue && t.DueDate < now && t.Status != "Done" && t.Status != "Cancelled"),
        byPriority = all.GroupBy(t => t.Priority).Select(g => new { priority = g.Key, count = g.Count() }).ToList(),
        byCategory = all.GroupBy(t => t.Category).Select(g => new { category = g.Key, count = g.Count() }).ToList(),
        byAssignee = all.Where(t => t.Status != "Done" && t.Status != "Cancelled")
                        .GroupBy(t => t.AssignedTo)
                        .Select(g => new { assignee = g.Key, count = g.Count() })
                        .OrderByDescending(x => x.count).ToList(),
    });
});

// ── BHW System ────────────────────────────────────────────────────────────────

// Summary dashboard
app.MapGet("/api/bhw/summary", async (AppDbContext db) =>
{
    var records = await db.BhwRecords.Where(r => r.Status == "Active").ToListAsync();
    var visits  = await db.HouseVisitLogs.ToListAsync();
    var meds    = await db.MedicineDistributions.ToListAsync();
    var today   = DateTime.UtcNow.Date;
    var month   = new DateTime(today.Year, today.Month, 1);
    return Results.Ok(new {
        pregnant   = records.Count(r => r.Category == "Pregnant"),
        seniors    = records.Count(r => r.Category == "Senior"),
        children   = records.Count(r => r.Category == "Child"),
        pwd        = records.Count(r => r.Category == "PWD"),
        highRisk   = records.Count(r => r.RiskLevel == "High" && r.Status == "Active"),
        visitsThisMonth = visits.Count(v => v.VisitDate >= month),
        medsThisMonth   = meds.Count(m => m.DistributedAt >= month),
        byCategory = records.GroupBy(r => r.Category).Select(g => new { category = g.Key, count = g.Count() }).ToList(),
    });
});

// BHW Records (watchlist) CRUD
app.MapGet("/api/bhw/records", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? category,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? status,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? sitio,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? search) =>
{
    var residents = await db.Residents.ToListAsync();
    var records   = await db.BhwRecords.OrderByDescending(r => r.CreatedAt).ToListAsync();
    if (!string.IsNullOrWhiteSpace(category)) records = records.Where(r => r.Category == category).ToList();
    if (!string.IsNullOrWhiteSpace(status))   records = records.Where(r => r.Status == status).ToList();
    var result = records.Select(r => {
        var res = residents.FirstOrDefault(x => x.Id == r.ResidentId);
        if (res == null) return null;
        if (!string.IsNullOrWhiteSpace(sitio) && res.Sitio != sitio) return null;
        var name = res.LastName + ", " + res.FirstName + (string.IsNullOrWhiteSpace(res.MiddleName) ? "" : " " + res.MiddleName[0] + ".");
        if (!string.IsNullOrWhiteSpace(search) && !name.Contains(search, StringComparison.OrdinalIgnoreCase)) return null;
        var age = res.BirthDate != default ? (int?)((DateTime.UtcNow - res.BirthDate).TotalDays / 365.25) : null;
        return new {
            r.Id, r.ResidentId, r.Category, r.Status, r.LmpDate, r.EddDate,
            r.GravidaPara, r.RiskLevel, r.ImmunizationStatus, r.NextImmunizationDate,
            r.AssignedBhw, r.Notes, r.CreatedAt, r.UpdatedAt,
            residentName = name, res.Sitio, res.Address, res.ContactNumber,
            res.HouseholdNo, age,
        };
    }).Where(x => x != null).ToList();
    return Results.Ok(result);
});

app.MapPost("/api/bhw/records", async (AppDbContext db, BhwRecord body) =>
{
    body.CreatedAt = DateTime.UtcNow;
    body.UpdatedAt = DateTime.UtcNow;
    db.BhwRecords.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapPut("/api/bhw/records/{id}", async (AppDbContext db, int id, BhwRecord body) =>
{
    var r = await db.BhwRecords.FindAsync(id);
    if (r is null) return Results.NotFound();
    r.Category = body.Category; r.Status = body.Status;
    r.LmpDate = body.LmpDate; r.EddDate = body.EddDate;
    r.GravidaPara = body.GravidaPara; r.RiskLevel = body.RiskLevel;
    r.ImmunizationStatus = body.ImmunizationStatus;
    r.NextImmunizationDate = body.NextImmunizationDate;
    r.AssignedBhw = body.AssignedBhw; r.Notes = body.Notes;
    r.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(r);
});

app.MapDelete("/api/bhw/records/{id}", async (AppDbContext db, int id) =>
{
    var r = await db.BhwRecords.FindAsync(id);
    if (r is null) return Results.NotFound();
    db.BhwRecords.Remove(r);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// Visit Logs
app.MapGet("/api/bhw/visits", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] int? residentId,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? visitedBy,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? from,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? to) =>
{
    var residents = await db.Residents.ToListAsync();
    var q = db.HouseVisitLogs.AsQueryable();
    if (residentId.HasValue) q = q.Where(v => v.ResidentId == residentId);
    if (!string.IsNullOrWhiteSpace(visitedBy)) q = q.Where(v => v.VisitedBy == visitedBy);
    if (!string.IsNullOrWhiteSpace(from) && DateTime.TryParse(from, out var fd)) q = q.Where(v => v.VisitDate >= fd);
    if (!string.IsNullOrWhiteSpace(to)   && DateTime.TryParse(to,   out var td)) q = q.Where(v => v.VisitDate <= td.AddDays(1));
    var visits = await q.OrderByDescending(v => v.VisitDate).Take(200).ToListAsync();
    var result = visits.Select(v => {
        var res = residents.FirstOrDefault(x => x.Id == v.ResidentId);
        return new {
            v.Id, v.ResidentId, v.BhwRecordId, v.VisitType, v.VisitedBy,
            v.VisitDate, v.Findings, v.ActionTaken, v.NextVisitDate,
            v.BloodPressure, v.Weight, v.Temperature, v.Notes, v.CreatedAt,
            residentName = res == null ? "" : res.LastName + ", " + res.FirstName,
            sitio = res?.Sitio ?? "", address = res?.Address ?? "",
        };
    });
    return Results.Ok(result);
});

app.MapPost("/api/bhw/visits", async (AppDbContext db, HouseVisitLog body) =>
{
    body.CreatedAt = DateTime.UtcNow;
    if (body.VisitDate == default) body.VisitDate = DateTime.UtcNow;
    db.HouseVisitLogs.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapDelete("/api/bhw/visits/{id}", async (AppDbContext db, int id) =>
{
    var v = await db.HouseVisitLogs.FindAsync(id);
    if (v is null) return Results.NotFound();
    db.HouseVisitLogs.Remove(v);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// Medicine Distribution
app.MapGet("/api/bhw/medicines", async (AppDbContext db,
    [Microsoft.AspNetCore.Mvc.FromQuery] int? residentId,
    [Microsoft.AspNetCore.Mvc.FromQuery] string? search) =>
{
    var residents = await db.Residents.ToListAsync();
    var q = db.MedicineDistributions.AsQueryable();
    if (residentId.HasValue) q = q.Where(m => m.ResidentId == residentId);
    var meds = await q.OrderByDescending(m => m.DistributedAt).Take(300).ToListAsync();
    var result = meds.Select(m => {
        var res = residents.FirstOrDefault(x => x.Id == m.ResidentId);
        var name = res == null ? "" : res.LastName + ", " + res.FirstName;
        if (!string.IsNullOrWhiteSpace(search) && !name.Contains(search, StringComparison.OrdinalIgnoreCase) && !m.MedicineName.Contains(search, StringComparison.OrdinalIgnoreCase)) return null;
        return new {
            m.Id, m.ResidentId, m.MedicineName, m.Quantity, m.Purpose,
            m.DistributedBy, m.Source, m.DistributedAt, m.NextPickupDate, m.Notes, m.CreatedAt,
            residentName = name, sitio = res?.Sitio ?? "", address = res?.Address ?? "",
        };
    }).Where(x => x != null).ToList();
    return Results.Ok(result);
});

app.MapPost("/api/bhw/medicines", async (AppDbContext db, MedicineDistribution body) =>
{
    body.CreatedAt = DateTime.UtcNow;
    if (body.DistributedAt == default) body.DistributedAt = DateTime.UtcNow;
    db.MedicineDistributions.Add(body);
    await db.SaveChangesAsync();
    return Results.Ok(body);
});

app.MapDelete("/api/bhw/medicines/{id}", async (AppDbContext db, int id) =>
{
    var m = await db.MedicineDistributions.FindAsync(id);
    if (m is null) return Results.NotFound();
    db.MedicineDistributions.Remove(m);
    await db.SaveChangesAsync();
    return Results.Ok();
});



// TEMP: one-time seed endpoint � POST /api/seed-residents, then remove
app.MapPost("/api/seed-residents", async (AppDbContext db) =>
{
    try {
        if (await db.Residents.AnyAsync())
            return Results.Ok(new { message = "Already seeded", count = await db.Residents.CountAsync() });
        var sqlPath = Path.Combine(AppContext.BaseDirectory, "seed_residents.sql");
        if (!File.Exists(sqlPath)) return Results.NotFound(new { message = $"Seed file not found at {sqlPath}" });
        var lines = await File.ReadAllLinesAsync(sqlPath);
        // Strip comment lines and blank lines, then split on semicolons
        var cleaned = string.Join("\n", lines.Where(l => !l.TrimStart().StartsWith("--") && l.Trim() != ""));
        var statements = cleaned.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync();
        int affected = 0;
        foreach (var stmt in statements) {
            if (string.IsNullOrWhiteSpace(stmt)) continue;
            using var cmd = conn.CreateCommand();
            cmd.CommandText = stmt;
            affected += await cmd.ExecuteNonQueryAsync();
        }
        await conn.CloseAsync();
        return Results.Ok(new { message = "Seeded", affected, count = await db.Residents.CountAsync() });
    } catch (Exception ex) {
        return Results.Problem(ex.Message);
    }
});
app.Run();

record TaskStatusPatch(string Status, string? CompletionNotes);

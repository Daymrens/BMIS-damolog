-- Barangay Damolog, Sogod Cebu — Real Budget Projects Seed Data
-- Based on actual congressional and DPWH projects (2023–2026)
-- Run against barangay.db after API has started (tables must exist)

-- ── COMPLETED PROJECTS ────────────────────────────────────────────────────────

INSERT INTO BudgetProjects (
  ProjectCode, Title, Category, Description, FundSource,
  AllocatedBudget, ActualExpense, Status,
  StartDate, EndDate, ActualEndDate,
  Implementor, Beneficiaries, BeneficiaryCount,
  Location, Notes, CreatedAt, CreatedBy
) VALUES (
  'PRJ-2024-001',
  'Road Rehabilitation — Cebu North Hagnaya Wharf Road (Damolog Section)',
  'Infrastructure',
  'Rehabilitation of the Cebu North Hagnaya Wharf Road passing through Barangay Damolog. Includes asphalt overlay, installation of solar street lights, solar road studs, and reflectorized pavement markings to improve night visibility and road safety.',
  'DPWH',
  48950000, 48950000, 'Completed',
  '2023-06-01', '2024-03-31', '2024-03-31',
  'Department of Public Works and Highways (DPWH) — Cebu 2nd District',
  'All residents of Barangay Damolog and commuters along Cebu North Road', 1200,
  'Cebu North Hagnaya Wharf Road, Barangay Damolog, Sogod, Cebu',
  'Funded under the congressional initiative of Rep. Duke Frasco. Formally completed and turned over March 2024. Features: asphalt overlay, solar street lights, solar studs, reflectorized markings.',
  '2023-06-01 08:00:00', 'admin'
);

INSERT INTO BudgetProjects (
  ProjectCode, Title, Category, Description, FundSource,
  AllocatedBudget, ActualExpense, Status,
  StartDate, EndDate, ActualEndDate,
  Implementor, Beneficiaries, BeneficiaryCount,
  Location, Notes, CreatedAt, CreatedBy
) VALUES (
  'PRJ-2025-002',
  'Senior Citizen Building Construction',
  'Social Services',
  'Construction of a dedicated Senior Citizen Building to serve as a center for elderly welfare programs, social services, and community activities for senior residents of Barangay Damolog.',
  'DILG',
  3500000, 3500000, 'Completed',
  '2024-06-01', '2026-03-15', '2026-03-15',
  'Congressional Office of Rep. Duke Frasco / DILG Region VII',
  'Senior citizens of Barangay Damolog', 180,
  'Barangay Damolog, Sogod, Cebu',
  'Part of a congressional initiative to improve access to social welfare services. Formally turned over March 2026. Managed in coordination with Barangay Captain Vivian Madera.',
  '2024-06-01 08:00:00', 'admin'
);

INSERT INTO BudgetProjects (
  ProjectCode, Title, Category, Description, FundSource,
  AllocatedBudget, ActualExpense, Status,
  StartDate, EndDate, ActualEndDate,
  Implementor, Beneficiaries, BeneficiaryCount,
  Location, Notes, CreatedAt, CreatedBy
) VALUES (
  'PRJ-2025-003',
  'Barangay Health Center Modernization',
  'Health',
  'Construction and modernization of the Barangay Health Center to provide improved access to basic healthcare services including maternal care, immunization, and primary consultations.',
  'DOH',
  4200000, 4200000, 'Completed',
  '2024-06-01', '2026-03-15', '2026-03-15',
  'Congressional Office of Rep. Duke Frasco / Department of Health Region VII',
  'All residents of Barangay Damolog', 1200,
  'Barangay Damolog, Sogod, Cebu',
  'Completed alongside the Senior Citizen Building as part of the same congressional initiative. Formally turned over March 2026.',
  '2024-06-01 08:00:00', 'admin'
);

-- ── ONGOING PROJECTS ──────────────────────────────────────────────────────────

INSERT INTO BudgetProjects (
  ProjectCode, Title, Category, Description, FundSource,
  AllocatedBudget, ActualExpense, Status,
  StartDate, EndDate, ActualEndDate,
  Implementor, Beneficiaries, BeneficiaryCount,
  Location, Notes, CreatedAt, CreatedBy
) VALUES (
  'PRJ-2025-004',
  'CTU Access Road Construction',
  'Infrastructure',
  'Construction of a new access road leading to the Cebu Technological University (CTU) campus located in Barangay Damolog. Includes road base preparation, concrete paving, and drainage works.',
  'DPWH',
  4950000, 1200000, 'Ongoing',
  '2025-04-01', '2025-12-31', NULL,
  'Department of Public Works and Highways (DPWH) — Cebu 2nd District',
  'CTU students, faculty, and residents of Barangay Damolog', 800,
  'CTU Campus Access Road, Barangay Damolog, Sogod, Cebu',
  'Scheduled to start April 2025. Funded under the congressional office of Rep. Duke Frasco. Improves access to the CTU campus within the barangay.',
  '2025-03-15 08:00:00', 'admin'
);

INSERT INTO BudgetProjects (
  ProjectCode, Title, Category, Description, FundSource,
  AllocatedBudget, ActualExpense, Status,
  StartDate, EndDate, ActualEndDate,
  Implementor, Beneficiaries, BeneficiaryCount,
  Location, Notes, CreatedAt, CreatedBy
) VALUES (
  'PRJ-2025-005',
  'Multi-Purpose Building Completion — Phase 3 (Social Services Wing)',
  'Social Services',
  'Completion of the remaining phase of the Barangay Multi-Purpose Building, specifically the social services wing. Includes interior finishing, electrical works, plumbing, and furnishing of service areas.',
  'Barangay Fund',
  1800000, 650000, 'Ongoing',
  '2024-10-01', '2025-09-30', NULL,
  'Barangay LGU — Barangay Damolog / Local Contractor',
  'All residents of Barangay Damolog', 1200,
  'Barangay Damolog, Sogod, Cebu',
  'Multiple phases of this building have been completed. This phase covers the social services wing. Rebid for completion phase was awarded in 2023; additional funding for social service facilities noted in late 2024.',
  '2024-10-01 08:00:00', 'admin'
);

INSERT INTO BudgetProjects (
  ProjectCode, Title, Category, Description, FundSource,
  AllocatedBudget, ActualExpense, Status,
  StartDate, EndDate, ActualEndDate,
  Implementor, Beneficiaries, BeneficiaryCount,
  Location, Notes, CreatedAt, CreatedBy
) VALUES (
  'PRJ-2024-006',
  'Sitio Road Concreting — Colo to Kalusayan',
  'Infrastructure',
  'Concreting of the barangay road connecting Sitio Colo to Sitio Kalusayan. Includes sub-base preparation, concrete paving, and installation of drainage structures to improve year-round accessibility.',
  'LGU',
  2000000, 800000, 'Ongoing',
  '2024-03-01', '2025-06-30', NULL,
  'Local Government Unit of Sogod / Barangay LGU',
  'Residents of Sitio Colo and Sitio Kalusayan', 320,
  'Barangay Road, Sitio Colo to Sitio Kalusayan, Barangay Damolog, Sogod, Cebu',
  'Put out for tender in early 2024 with a budget of ₱2 million. Directly benefits residents of Sitio Colo and Sitio Kalusayan by improving road connectivity.',
  '2024-03-01 08:00:00', 'admin'
);

-- ── PLANNED PROJECTS ──────────────────────────────────────────────────────────

INSERT INTO BudgetProjects (
  ProjectCode, Title, Category, Description, FundSource,
  AllocatedBudget, ActualExpense, Status,
  StartDate, EndDate, ActualEndDate,
  Implementor, Beneficiaries, BeneficiaryCount,
  Location, Notes, CreatedAt, CreatedBy
) VALUES (
  'PRJ-2026-007',
  'Barangay Livelihood Training Center',
  'Livelihood',
  'Establishment of a livelihood training center to provide skills training, entrepreneurship programs, and livelihood assistance to unemployed and underemployed residents of Barangay Damolog.',
  'DOLE',
  1500000, 0, 'Planned',
  '2026-07-01', '2027-03-31', NULL,
  'Department of Labor and Employment (DOLE) / Barangay LGU',
  'Unemployed and underemployed residents', 200,
  'Barangay Damolog, Sogod, Cebu',
  'Proposed project in coordination with DOLE Region VII. To be implemented in partnership with the Lamac Multi-Purpose Cooperative satellite office located in the barangay.',
  '2026-01-10 08:00:00', 'admin'
);

INSERT INTO BudgetProjects (
  ProjectCode, Title, Category, Description, FundSource,
  AllocatedBudget, ActualExpense, Status,
  StartDate, EndDate, ActualEndDate,
  Implementor, Beneficiaries, BeneficiaryCount,
  Location, Notes, CreatedAt, CreatedBy
) VALUES (
  'PRJ-2026-008',
  'Solar-Powered Street Lighting — Sitio Highlander & Lantawan',
  'Infrastructure',
  'Installation of solar-powered street lights along the main roads of Sitio Highlander and Sitio Lantawan to improve night safety and reduce electricity costs for the barangay.',
  'Barangay Fund',
  480000, 0, 'Planned',
  '2026-06-01', '2026-09-30', NULL,
  'Barangay LGU — Barangay Damolog',
  'Residents of Sitio Highlander and Sitio Lantawan', 280,
  'Sitio Highlander and Sitio Lantawan, Barangay Damolog, Sogod, Cebu',
  'Inspired by the solar street lighting component of the 2024 DPWH road rehabilitation project. Extends solar lighting coverage to interior sitios.',
  '2026-02-01 08:00:00', 'admin'
);

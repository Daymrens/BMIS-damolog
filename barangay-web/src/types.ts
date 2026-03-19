export const SITIOS = [
  'Proper', 'Kalubihan', 'Highlander', 'Colo',
  'Kalusayan', 'Patag', 'Damolog Gamay', 'Lantawan', 'Villa Gonzalo',
] as const;

export type Sitio = typeof SITIOS[number];

export interface Resident {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string;
  birthDate: string;
  gender: string;
  civilStatus: string;
  sitio: string;
  address: string;
  householdNo: string;
  occupation: string;
  contactNumber: string;
  email: string;
  isVoter: boolean;
  isSenior: boolean;
  isPWD: boolean;
  is4Ps: boolean;
  createdAt?: string;
}

export interface Official {
  id: number;
  name: string;
  position: string;
  contactNumber: string;
  termStart: string;
  termEnd: string;
  isActive: boolean;
}

export interface Document {
  id: number;
  residentId: number;
  resident?: Resident;
  documentType: string;
  purpose: string;
  issuedAt: string;
  issuedBy: string;
  controlNumber: string;
}

export interface DocumentVersion {
  id: number;
  documentId: number;
  version: number;
  action: 'Issued' | 'Reissued' | 'Edited';
  documentType: string;
  purpose: string;
  issuedBy: string;
  controlNumber: string;
  changeNote: string;
  changedBy: string;
  createdAt: string;
  residentName?: string;
  residentSitio?: string;
}

export const INCIDENT_TYPES = [
  'Dispute', 'Noise Complaint', 'Physical Violence', 'Theft/Robbery',
  'Trespassing', 'Threat/Intimidation', 'Domestic Violence', 'Other',
] as const;

export const BLOTTER_STATUSES = [
  'Pending', 'Under Mediation', 'Settled', 'Escalated', 'Dismissed',
] as const;

export interface Blotter {
  id: number;
  caseNumber: string;
  complainant: string;
  complainantAddress: string;
  complainantContact: string;
  respondent: string;
  respondentAddress: string;
  respondentContact: string;
  incidentType: string;
  incident: string;
  details: string;
  location: string;
  incidentDate: string;
  filedDate: string;
  luponChairperson: string;
  hearingDate?: string;
  hearingNotes: string;
  nextHearingDate?: string;
  resolution: string;
  status: string;
  resolvedDate?: string;
}

export const PAYMENT_CATEGORIES = [
  'Clearance Fee',
  'Business Permit',
  'Certification Fee',
  'Blotter Fee',
  'Other',
] as const;

export type PaymentCategory = typeof PAYMENT_CATEGORIES[number];

export const FEE_SCHEDULE: Record<string, number> = {
  'Barangay Clearance':          50,
  'Certificate of Residency':    50,
  'Certificate of Indigency':     0,
  'Barangay Business Clearance': 200,
  'Barangay Blotter Certification': 100,
};

export interface Payment {
  id: number;
  orNumber: string;
  payerName: string;
  residentId?: number;
  resident?: Resident;
  documentId?: number;
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'Cash' | 'GCash' | 'Maya';
  collectedBy: string;
  status: 'Paid' | 'Voided';
  voidReason: string;
  paidAt: string;
}

export interface PaymentSummary {
  dailyTotal: number;
  dailyCount: number;
  monthlyTotal: number;
  yearlyTotal: number;
  byCategory: { category: string; count: number; total: number }[];
  recentPayments: Payment[];
}

export interface QueueRequest {
  id: number;
  queueNumber: string;
  requesterName: string;
  residentId?: number;
  resident?: Resident;
  documentType: string;
  purpose: string;
  contactNumber: string;
  requestType: 'Walk-in' | 'Online';
  status: 'Pending' | 'Processing' | 'Released' | 'Cancelled';
  notes: string;
  requestedAt: string;
  processedAt?: string;
  releasedAt?: string;
  issuedDocumentId?: number;
  issuedDocument?: Document;
}

export interface Stats {
  totalResidents: number;
  totalOfficials: number;
  totalDocuments: number;
  pendingBlotters: number;
  maleResidents: number;
  femaleResidents: number;
  registeredVoters: number;
  seniorResidents: number;
  minorResidents: number;
  pwdResidents: number;
  fourPsResidents: number;
  docsThisMonth: number;
  todayQueueTotal: number;
  todayQueuePending: number;
  todayCollections: number;
  todayNewResidents: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  docsByType: { type: string; count: number }[];
  blottersByStatus: { status: string; count: number }[];
  sitioBreakdown: { sitio: string; count: number }[];
  recentResidents: { firstName: string; lastName: string; address: string; sitio: string; createdAt: string }[];
  recentBlotters: { caseNumber: string; complainant: string; incident: string; status: string; filedDate: string }[];
}

export interface ReportMonth {
  month: string;
  docs: number;
  revenue: number;
  newResidents: number;
  blotters: number;
}

export interface Reports {
  year: number;
  monthly: ReportMonth[];
  docsByType: { type: string; count: number }[];
  revenueByCategory: { category: string; total: number }[];
  totalDocs: number;
  totalRevenue: number;
  totalNewResidents: number;
  totalBlotters: number;
}

export interface HouseholdMember {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string;
  birthDate: string;
  gender: string;
  civilStatus: string;
  occupation: string;
  age: number;
  isVoter: boolean;
  isSenior: boolean;
  isPWD: boolean;
  is4Ps: boolean;
}

export interface Household {
  sitio: string;
  householdNo: string;
  rawHouseholdNo: string;
  address: string;
  members: HouseholdMember[];
  totalMembers: number;
  voters: number;
  seniors: number;
  minors: number;
  pWD: number;
  fourPs: number;
}

export interface SitioSummary {
  sitio: string;
  households: number;
  population: number;
  voters: number;
  seniors: number;
  minors: number;
  pWD: number;
  fourPs: number;
}

export interface HouseholdData {
  households: Household[];
  sitioSummary: SitioSummary[];
}

export const EVACUATION_STATUSES = ['Standby', 'Active', 'Full', 'Closed'] as const;
export const RELIEF_ITEMS = ['Food Pack', 'Hygiene Kit', 'Blanket', 'Water', 'Medicine', 'Clothing', 'Other'] as const;

export interface EvacuationCenter {
  id: number;
  name: string;
  location: string;
  sitio: string;
  capacity: number;
  status: string;
  contactPerson: string;
  contactNumber: string;
  notes: string;
  createdAt: string;
}

export interface EvacueeLog {
  id: number;
  evacuationCenterId: number;
  centerName: string;
  residentId?: number;
  evacueeName: string;
  sitio: string;
  address: string;
  headCount: number;
  hasSenior: boolean;
  hasPWD: boolean;
  hasInfant: boolean;
  hasPregnant: boolean;
  notes: string;
  checkedInAt: string;
  checkedOutAt?: string;
  status: string;
  recordedBy: string;
}

export interface ReliefLog {
  id: number;
  disasterName: string;
  residentId?: number;
  recipientName: string;
  sitio: string;
  address: string;
  reliefItem: string;
  quantity: number;
  unit: string;
  distributedBy: string;
  notes: string;
  distributedAt: string;
}

export interface VulnerableResident {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string;
  birthDate: string;
  gender: string;
  sitio: string;
  address: string;
  householdNo: string;
  contactNumber: string;
  age: number;
  isSenior: boolean;
  isPWD: boolean;
  is4Ps: boolean;
  isMinor: boolean;
}

export interface VulnerableSummary {
  total: number;
  seniors: number;
  pWD: number;
  minors: number;
  fourPs: number;
}

export interface MapSitioData {
  sitio: string;
  total: number;
  voters: number;
  seniors: number;
  pWD: number;
  fourPs: number;
  minors: number;
  vulnerable: number;
  households: number;
}

export const EVENT_TYPES = [
  'Meeting', 'Hearing', 'Appointment', 'Community Activity', 'Other',
] as const;

export const EVENT_STATUSES = ['Scheduled', 'Done', 'Cancelled'] as const;

export interface BarangayEvent {
  id: number;
  title: string;
  eventType: string;
  location: string;
  startTime: string;
  endTime: string;
  organizer: string;
  description: string;
  status: string;
  blotterId?: number;
  blotterCaseNumber: string;
  participants: string;
  createdAt: string;
  createdBy: string;
}

export const VACCINE_NAMES = [
  'COVID-19 (Sinovac)', 'COVID-19 (Pfizer)', 'COVID-19 (AstraZeneca)', 'COVID-19 (Moderna)',
  'Influenza', 'Hepatitis B', 'Hepatitis A', 'Tetanus (TT)', 'MMR', 'BCG',
  'Pneumococcal', 'Rabies', 'HPV', 'Other',
] as const;

export const DOSE_NUMBERS = ['1st Dose', '2nd Dose', '3rd Dose', 'Booster', 'Single Dose'] as const;

export const CHRONIC_CONDITIONS = [
  'Hypertension', 'Diabetes', 'Asthma', 'Heart Disease', 'Kidney Disease',
  'Tuberculosis', 'Cancer', 'Arthritis', 'Stroke', 'Mental Health', 'Other',
] as const;

export const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'] as const;

export const HEALTH_WORKER_ROLES = ['BHW', 'Midwife', 'Nurse', 'Doctor', 'Dentist', 'Nutritionist'] as const;

export interface HealthRecord {
  id: number;
  residentId: number;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  philHealthNo: string;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

export interface VaccinationRecord {
  id: number;
  residentId: number;
  resident?: { firstName: string; lastName: string; sitio: string; };
  vaccineName: string;
  doseNumber: string;
  dateGiven: string;
  batchNo: string;
  administeredBy: string;
  venue: string;
  nextDoseDate?: string;
  notes: string;
  createdAt: string;
}

export interface HealthWorker {
  id: number;
  name: string;
  role: string;
  sitio: string;
  contactNumber: string;
  qualifications: string;
  isActive: boolean;
  assignedSince: string;
  notes: string;
}

export interface HealthResidentRow {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  sitio: string;
  address: string;
  contactNumber: string;
  isSenior: boolean;
  isPWD: boolean;
  is4Ps: boolean;
  age: number;
  healthRecord?: HealthRecord;
}

export interface HealthSummary {
  totalResidents: number;
  withHealthRecord: number;
  withPhilHealth: number;
  withConditions: number;
  totalVaccinations: number;
  activeWorkers: number;
  vaxByVaccine: { vaccine: string; count: number }[];
  conditionBreakdown: { condition: string; count: number }[];
  dueSoon: { id: number; residentId: number; vaccineName: string; doseNumber: string; nextDoseDate: string; residentName: string; sitio: string }[];
}

export const FAMILY_ROLES = [
  'Head', 'Spouse', 'Child', 'Parent', 'Sibling', 'Dependent', 'Guardian', 'Other',
] as const;
export type FamilyRole = typeof FAMILY_ROLES[number];

export interface FamilyMember {
  linkId?: number;
  id: number;
  firstName: string;
  lastName: string;
  middleName: string;
  birthDate: string;
  gender: string;
  sitio: string;
  address: string;
  contactNumber: string;
  isVoter: boolean;
  isSenior: boolean;
  isPWD: boolean;
  is4Ps: boolean;
  age: number | null;
  role: string;
  notes: string;
}

export interface FamilyTree {
  resident: {
    id: number; firstName: string; lastName: string; middleName: string;
    birthDate: string; gender: string; sitio: string; address: string;
    contactNumber: string; isVoter: boolean; isSenior: boolean; isPWD: boolean; is4Ps: boolean;
    age: number | null;
  };
  members: FamilyMember[];
}

export interface HouseholdTreeLink {
  id: number;
  residentId: number;
  relatedResidentId: number;
  role: string;
  notes: string;
}

export interface HouseholdTreeData {
  members: Array<{
    id: number; firstName: string; lastName: string; middleName: string;
    birthDate: string; gender: string; sitio: string; address: string;
    contactNumber: string; isVoter: boolean; isSenior: boolean; isPWD: boolean; is4Ps: boolean;
    age: number | null;
  }>;
  links: HouseholdTreeLink[];
}

export interface DuplicateGroup {
  count: number;
  reason: string;
  members: Resident[];
}

export const PROJECT_CATEGORIES = [
  'Infrastructure', 'Social Services', 'Health', 'Education', 'Environment', 'Livelihood', 'Other',
] as const;

export const PROJECT_STATUSES = ['Planned', 'Ongoing', 'Completed', 'On Hold', 'Cancelled'] as const;

export const FUND_SOURCES = [
  'Barangay Fund', 'DILG', 'LGU', 'DSWD', 'DOLE', 'DOH', 'DPWH', 'Other',
] as const;

export const EXPENSE_CATEGORIES = ['Labor', 'Materials', 'Equipment', 'Services', 'Other'] as const;

export interface BudgetProject {
  id: number;
  projectCode: string;
  title: string;
  category: string;
  description: string;
  fundSource: string;
  allocatedBudget: number;
  actualExpense: number;
  status: string;
  startDate: string;
  endDate?: string;
  actualEndDate?: string;
  implementor: string;
  beneficiaries: string;
  beneficiaryCount: number;
  location: string;
  notes: string;
  createdAt: string;
  createdBy: string;
}

export interface ProjectExpense {
  id: number;
  projectId: number;
  description: string;
  category: string;
  amount: number;
  expenseDate: string;
  recordedBy: string;
  receiptNo: string;
  notes: string;
}

export interface BudgetSummary {
  year: number;
  totalProjects: number;
  totalAllocated: number;
  totalSpent: number;
  ongoingCount: number;
  completedCount: number;
  plannedCount: number;
  byCategory: { category: string; count: number; allocated: number; spent: number }[];
  byStatus: { status: string; count: number }[];
}

// ── Livelihood & Skills ───────────────────────────────────────────────────────

export const SKILL_CATEGORIES = ['Trade', 'Agriculture', 'Service', 'Tech', 'Education', 'Other'] as const;
export type SkillCategory = typeof SKILL_CATEGORIES[number];

export const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Expert'] as const;

export const PROGRAM_TYPES = ['Training', 'Employment', 'Livelihood', 'Seminar'] as const;
export const PROGRAM_STATUSES = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'] as const;

export const SKILL_COLORS = ['blue', 'green', 'amber', 'orange', 'yellow', 'pink', 'purple', 'teal', 'indigo', 'gray'] as const;

export interface SkillTag {
  id: number;
  name: string;
  category: string;
  description: string;
  color: string;
  residentCount: number;
}

export interface ResidentSkill {
  id: number;
  residentId: number;
  skillTagId: number;
  skillName: string;
  skillCategory: string;
  skillColor: string;
  proficiencyLevel: string;
  isAvailable: boolean;
  notes: string;
  taggedAt: string;
  taggedBy: string;
}

export interface SkilledResident {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string;
  gender: string;
  sitio: string;
  address: string;
  contactNumber: string;
  occupation: string;
  age: number | null;
  isSenior: boolean;
  isPWD: boolean;
  is4Ps: boolean;
  skills: ResidentSkill[];
}

export interface LivelihoodProgram {
  id: number;
  title: string;
  programType: string;
  targetSkills: string;
  description: string;
  organizer: string;
  venue: string;
  startDate: string;
  endDate?: string;
  slotCount: number;
  status: string;
  notes: string;
  createdAt: string;
  createdBy: string;
}

export interface LivelihoodSummary {
  totalTagged: number;
  totalAvailable: number;
  totalSkills: number;
  byCategory: { category: string; count: number }[];
  skills: { id: number; name: string; category: string; color: string; description: string; count: number; available: number }[];
}

// ── Task Assignment ───────────────────────────────────────────────────────────

export const TASK_CATEGORIES = ['General', 'Inspection', 'Follow-up', 'Complaint', 'Maintenance', 'Other'] as const;
export const TASK_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const;
export const TASK_STATUSES   = ['Pending', 'In Progress', 'Done', 'Cancelled'] as const;

export interface TaskAssignment {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string;
  assignedBy: string;
  location: string;
  sitio: string;
  relatedTo: string;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  completionNotes: string;
  notes: string;
  createdAt: string;
}

export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  cancelled: number;
  overdue: number;
  byPriority: { priority: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byAssignee: { assignee: string; count: number }[];
}

// ── BHW System ────────────────────────────────────────────────────────────────

export const BHW_CATEGORIES = ['Pregnant', 'Senior', 'Child', 'PWD'] as const;
export const BHW_STATUSES   = ['Active', 'Inactive', 'Delivered', 'Deceased'] as const;
export const BHW_RISK_LEVELS = ['Low', 'Moderate', 'High'] as const;
export const VISIT_TYPES    = ['Routine', 'Follow-up', 'Emergency', 'Immunization', 'Prenatal'] as const;
export const MEDICINE_SOURCES = ['RHU', 'DOH', 'Barangay Stock', 'Other'] as const;
export const IMMUNIZATION_STATUSES = ['Complete', 'Incomplete', 'None'] as const;

export interface BhwRecord {
  id: number;
  residentId: number;
  category: string;
  status: string;
  lmpDate?: string;
  eddDate?: string;
  gravidaPara: number;
  riskLevel: string;
  immunizationStatus: string;
  nextImmunizationDate: string;
  assignedBhw: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  // joined
  residentName: string;
  sitio: string;
  address: string;
  contactNumber: string;
  householdNo: string;
  age: number | null;
}

export interface HouseVisitLog {
  id: number;
  residentId: number;
  bhwRecordId?: number;
  visitType: string;
  visitedBy: string;
  visitDate: string;
  findings: string;
  actionTaken: string;
  nextVisitDate: string;
  bloodPressure: string;
  weight: string;
  temperature: string;
  notes: string;
  createdAt: string;
  residentName: string;
  sitio: string;
  address: string;
}

export interface MedicineDistribution {
  id: number;
  residentId: number;
  medicineName: string;
  quantity: string;
  purpose: string;
  distributedBy: string;
  source: string;
  distributedAt: string;
  nextPickupDate: string;
  notes: string;
  createdAt: string;
  residentName: string;
  sitio: string;
  address: string;
}

export interface BhwSummary {
  pregnant: number;
  seniors: number;
  children: number;
  pwd: number;
  highRisk: number;
  visitsThisMonth: number;
  medsThisMonth: number;
  byCategory: { category: string; count: number }[];
}

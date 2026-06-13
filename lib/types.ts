export type Vendor = {
  id: number;
  name: string;
  description: string;
  cert_catalog: string;
  status: string;
  created_at: string;
};

export type Tier = {
  id: number;
  vendor_id: number;
  name: string;
  rank: number;
  min_active_certs: number;
  min_annual_revenue: number;
};

export type Company = {
  id: number;
  name: string;
  created_at: string;
};

export type Partner = {
  id: number;
  vendor_id: number;
  company_id: number;
  name: string;
  tier: string;
  status: string;
  website: string;
  region: string;
  annual_revenue: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Office = {
  id: number;
  partner_id: number;
  name: string;
  region: string;
  address: string;
  phone: string;
  notes: string;
  created_at: string;
};

export type Person = {
  id: number;
  partner_id: number;
  company_id: number;
  /** 1 = shared across every vendor the company is engaged with (Sales/Management). */
  company_wide: number;
  office_id: number | null;
  name: string;
  role: string;
  title: string;
  email: string;
  phone: string;
  linkedin_url: string;
  status: string;
  departed_at: string;
  departed_to: string;
  notes: string;
  created_at: string;
};

export type Certification = {
  id: number;
  person_id: number;
  vendor_id: number;
  name: string;
  level: string;
  issued_date: string;
  expiry_date: string;
  notes: string;
  created_at: string;
};

export type Engagement = {
  id: number;
  partner_id: number;
  person_id: number | null;
  type: string;
  date: string;
  summary: string;
  topics: string;
  details: string;
  created_at: string;
};

export type Deal = {
  id: number;
  partner_id: number;
  customer: string;
  title: string;
  value: number;
  stage: string;
  support_provided: string;
  registered_date: string;
  closed_date: string;
  salesforce_id: string;
  notes: string;
  created_at: string;
};

export type MdfEntry = {
  id: number;
  partner_id: number;
  entry_date: string;
  kind: string;
  amount: number;
  description: string;
  created_at: string;
};

export type License = {
  id: number;
  partner_id: number;
  product: string;
  kind: string;
  identifier: string;
  issued_date: string;
  expiry_date: string;
  notes: string;
  created_at: string;
};

export type BusinessGoal = {
  id: number;
  partner_id: number;
  year: number;
  title: string;
  target: string;
  progress_pct: number;
  notes: string;
  created_at: string;
};

export type Competitor = {
  id: number;
  partner_id: number;
  vendor: string;
  notes: string;
  created_at: string;
};

export type Need = {
  id: number;
  partner_id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
};

export type Problem = {
  id: number;
  partner_id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
};

export type FollowUp = {
  id: number;
  partner_id: number;
  title: string;
  /** ISO date (YYYY-MM-DD); empty string means no due date. */
  due_date: string;
  /** 1 = completed. */
  done: number;
  created_at: string;
};

export const PERSON_ROLES = ["Sales", "Technical", "Management", "Other"];
/**
 * Roles that belong to the company as a whole rather than to one vendor
 * relationship: they auto-appear under every vendor the company is engaged
 * with. Technical (and Other) staff are added per vendor, since being
 * technical for one vendor doesn't imply certification on another.
 */
export const COMPANY_WIDE_ROLES = ["Sales", "Management"];
export const ENGAGEMENT_TYPES = [
  "Visit",
  "Lunch/Dinner",
  "QBR",
  "Enablement session",
  "Meeting",
  "Call",
  "Email",
  "Event",
  "Other",
];
export const COMMON_TOPICS = [
  "Pipeline",
  "Roadmap",
  "Certifications",
  "Enablement",
  "MDF/Marketing",
  "Pricing",
  "Support/Escalation",
  "Deal support",
  "Relationship",
];
export const DEAL_STAGES = ["Registered", "In progress", "Won", "Lost"];
export const LICENSE_KINDS = ["NFR", "Lab", "Demo hardware", "Other"];
export const MDF_KINDS = ["Allocation", "Usage"];
export const PRIORITIES = ["Low", "Medium", "High"];
export const SEVERITIES = ["Low", "Medium", "High", "Critical"];
export const NEED_STATUSES = ["Open", "In progress", "Done"];
export const PROBLEM_STATUSES = ["Open", "Monitoring", "Resolved"];
export const PARTNER_STATUSES = ["Active", "Onboarding", "Inactive"];
export const VENDOR_STATUSES = ["Active", "Archived"];

/** The default program tiers seeded for every new vendor. */
export const DEFAULT_TIERS: {
  name: string;
  rank: number;
  min_active_certs: number;
  min_annual_revenue: number;
}[] = [
  { name: "Authorized", rank: 1, min_active_certs: 1, min_annual_revenue: 0 },
  { name: "Silver", rank: 2, min_active_certs: 3, min_annual_revenue: 100000 },
  { name: "Gold", rank: 3, min_active_certs: 6, min_annual_revenue: 500000 },
];

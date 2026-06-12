export type Tier = {
  id: number;
  name: string;
  rank: number;
  min_active_certs: number;
  min_annual_revenue: number;
};

export type Partner = {
  id: number;
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

export const PERSON_ROLES = ["Sales", "Technical", "Management", "Other"];
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

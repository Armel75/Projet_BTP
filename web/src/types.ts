export type User = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  email_verified?: boolean;
  account_status?: string;
  mfa_enabled?: boolean;
  department?: string;
  cost_center?: string;
  hire_date?: string;
  termination_date?: string;
  timezone?: string;
  language_preference?: string;
  userRoles?: { role: { code: string; name: string } }[];
  permissions?: string[]; // resolved permission codes, e.g. ["user:read", "project:create"]
};

export type Project = {
  id: string;
  code: string;
  title: string;
  status: string;
  start_date?: string;
  end_date?: string;
  budget_initial: number;
  currency: string;
  location: string;
  client_name?: string;
  client_contact_name?: string;
  client_phone?: string;
  street_address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  budget_approved?: number;
  budget_committed?: number;
  contingency_budget?: number;
  permit_number?: string;
  permit_type?: string;
  risk_classification?: string;
  building_type?: string;
  erp_project_id?: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  progress: number;
};

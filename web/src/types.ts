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
  description?: string;
  status: string;
  phase?: string;
  start_date?: string;
  end_date?: string;
  budget_initial: number;
  currency: string;
  location: string;
  moe_firm_name?: string;
  control_bureau?: string;
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
  budget_spent?: number;
  contingency_budget?: number;
  hse_responsible_id?: number;
  permit_number?: string;
  permit_type?: string;
  is_archived?: boolean;
  risk_classification?: string;
  building_type?: string;
  erp_project_id?: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  schedule_status?: string;
  progress: number;
  is_archived?: boolean;
  archived_at?: string | null;
};

// ─── Incident ─────────────────────────────────────────────────────────────────

export type IncidentStatusHistory = {
  id: number;
  incident_id: number;
  tenant_id: number;
  from_status?: string | null;
  to_status: string;
  from_severity?: string | null;
  to_severity?: string | null;
  reason?: string | null;
  comment?: string | null;
  changed_by?: number | null;
  changed_at: string;
};

// ─── ProjectLot ───────────────────────────────────────────────────────────────

export type LotStatusHistory = {
  id: number;
  lot_id: number;
  tenant_id: number;
  from_status?: string | null;
  to_status?: string | null;
  from_schedule_status?: string | null;
  to_schedule_status?: string | null;
  reason?: string | null;
  comment?: string | null;
  changed_by?: number | null;
  changed_at: string;
};

// ─── Task Status History ──────────────────────────────────────────────────────

export type TaskStatusHistory = {
  id: number;
  task_id: number;
  tenant_id: number;
  from_status?: string | null;
  to_status?: string | null;
  from_schedule_status?: string | null;
  to_schedule_status?: string | null;
  reason?: string | null;
  comment?: string | null;
  changed_by?: number | null;
  changed_at: string;
};

// ─── ExecutionNote ────────────────────────────────────────────────────────────

export type ExecutionNote = {
  id: number;
  tenant_id: number;
  project_id: number;
  lot_id?: number | null;
  task_id?: number | null;
  incident_id?: number | null;
  parent_id?: number | null;
  content: string;
  category: string;
  visibility: string;
  source: string;
  requires_attention: boolean;
  is_pinned: boolean;
  created_by?: number | null;
  edited_by?: number | null;
  edited_at?: string | null;
  resolved_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  createdBy?: { id: number; firstname: string; lastname: string } | null;
  project?: { id: number; code: string; title: string; project_manager_id?: number | null } | null;
  lot?: { id: number; lot_number: string; name: string } | null;
  task?: { id: number; title: string } | null;
  incident?: { id: number; type: string; title?: string } | null;
  replies?: ExecutionNote[];
};

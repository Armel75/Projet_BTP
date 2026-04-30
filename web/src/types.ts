export type User = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
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
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  progress: number;
};

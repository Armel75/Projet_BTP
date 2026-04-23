export interface Project {
  id: string;
  project_code: string;
  title: string;
  description: string | null;
  client_name: string | null;
  status: string;
  created_at: string;
  creator?: {
    firstname: string;
    lastname: string;
  };
  metadata?: {
    budget_estimated: number;
    currency: string;
  };
}

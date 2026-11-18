export type ApiRow = Record<string, unknown>;

export interface Account extends ApiRow {
  user_id: number;
  school_id: string;
  full_name: string;
  role: string;
  verification_status: string;
  account_status: string;
}

export interface SessionResponse {
  account: Account;
  permissions: { permission: string }[];
}

export interface ApiProblem {
  error?: string;
  detail?: string;
  title?: string;
}

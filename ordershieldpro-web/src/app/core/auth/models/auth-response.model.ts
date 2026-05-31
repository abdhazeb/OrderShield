export interface AuthResponse {
  userId: string;
  /** Null when registration is awaiting SuperAdmin approval. */
  token: string | null;
  /** Null when registration is awaiting SuperAdmin approval. */
  refreshToken: string | null;
  language?: string;
  errors?: string[];
  /** True when the account was created but is pending SuperAdmin approval. */
  pendingApproval?: boolean;
  /** Server-supplied informational message (e.g. "awaiting approval"). */
  message?: string | null;
}

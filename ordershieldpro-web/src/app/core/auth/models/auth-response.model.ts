export interface AuthResponse {
  userId: string;
  token: string;
  refreshToken: string;
  language?: string;
  errors?: string[];
}

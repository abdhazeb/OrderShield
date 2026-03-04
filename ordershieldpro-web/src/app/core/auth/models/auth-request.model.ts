import { Language, UserRole } from '../../enums';

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  language: Language;
  organization?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  userId: string;
  refreshToken: string;
}

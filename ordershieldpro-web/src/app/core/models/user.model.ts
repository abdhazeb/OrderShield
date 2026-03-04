import { Language, SubscriptionTier, UserRole } from '../enums';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  region?: string;
  languagePreference: Language;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiryDate?: string;
  trustScore: number;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  region?: string;
}

export interface UpdateLanguageRequest {
  language: Language;
}

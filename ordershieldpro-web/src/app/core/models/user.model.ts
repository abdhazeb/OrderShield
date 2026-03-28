import { Language, SubscriptionTier, UserRole } from '../enums';

export interface UserProfile {
  id?: string;
  fullName: string;
  email: string;
  role?: UserRole;
  region?: string;
  languagePreference: Language | string;
  subscriptionTier: SubscriptionTier | number;
  subscriptionExpiryDate?: string;
  trustScore: number;
  isActive?: boolean;
  createdAt?: string;
  reviewCount: number;
  watchlistCount: number;
  phoneNumber?: string;
  businessName?: string;
  licenseAddress?: string;
  businessPhone?: string;
  businessLicenseFilePath?: string;
  isBusinessVerified?: boolean;
}

export interface UpdateProfileRequest {
  fullName: string;
  region?: string;
}

export interface UpdateLanguageRequest {
  language: Language;
}

import { SubscriptionTier } from '../enums';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  monthlyPrice: number;
  description?: string;
  maxReviewsPerMonth: number;
  maxWatchlistSize: number;
  hasPriorityVerification: boolean;
  hasAdvancedFilters: boolean;
  hasApiAccess: boolean;
  hasDedicatedSupport: boolean;
  featuresJson?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CurrentSubscription {
  plan: SubscriptionPlan;
  expiryDate?: string;
  isActive: boolean;
}

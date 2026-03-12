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
  tier: SubscriptionTier;
  planName: string;
  expiryDate?: string;
}

export interface DurationOption {
  years: number;
  totalPrice: number;
  discountPercent: number;
  savedAmount: number;
}

export interface SubscriptionPricing {
  tier: SubscriptionTier;
  planName: string;
  annualPrice: number;
  options: DurationOption[];
}

export interface SubscriptionRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedTier: SubscriptionTier;
  durationYears: number;
  totalAmount: number;
  paymentProofFileName?: string;
  paymentNotes?: string;
  status: SubscriptionRequestStatus;
  adminNotes?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
}

export enum SubscriptionRequestStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2
}

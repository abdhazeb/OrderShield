import { EntityType, VerificationStatus } from '../enums';

export interface EntitySearchResult {
  id: string;
  legalName: string;
  tradeName?: string;
  entityType: EntityType;
  country: string;
  region?: string;
  productCategories?: string;
  verificationStatus: VerificationStatus;
  totalReviewCount: number;
  infoReviewCount: number;
  warningReviewCount: number;
  criticalReviewCount: number;
  lastReviewDate?: string;
  listedDate: string;
  /** Only ever present for moderators — hidden entities are filtered out for everyone else. */
  isHidden?: boolean;
}

export interface EntityDetail {
  id: string;
  legalName: string;
  tradeName?: string;
  entityType: EntityType;
  country: string;
  region?: string;
  city?: string;
  productCategories?: string;
  verificationStatus: VerificationStatus;
  verificationScore: number;
  externalRegistryLinks?: string;
  totalReviewCount: number;
  infoReviewCount: number;
  warningReviewCount: number;
  criticalReviewCount: number;
  lastReviewDate?: string;
  listedDate: string;
  phoneNumbers: EntityPhoneNumber[];
  weChatIds: EntityWeChatId[];
  historicalNames: EntityHistoricalName[];
  followerCount: number;
  isFollowed: boolean;
  /** Withheld from public search and profile pages. Only moderators ever see this true. */
  isHidden?: boolean;
}

export interface EntityPhoneNumber {
  id: string;
  phoneNumber: string;
  isPrimary: boolean;
}

export interface EntityWeChatId {
  id: string;
  weChatId: string;
  isPrimary: boolean;
}

export interface EntityHistoricalName {
  id: string;
  previousName: string;
  changedDate?: string;
}

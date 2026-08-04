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
  /**
   * Every number and other name the entity is known by. Search matches on both, so these
   * explain a result that matched nothing visible in its name — and are what a broker
   * checking a phone number against a rebranded supplier is actually looking for.
   */
  phoneNumbers?: string[];
  alternativeNames?: string[];
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
  /**
   * Flattened by the API — `EntityDetailDto` projects each collection down to its one
   * meaningful string (`p.PhoneNumber`, `w.WeChatId`, `h.PreviousName`). Typing these as
   * objects is what rendered the edit form's phone box as ", ," and silently wiped the
   * WeChat IDs on every save, since `p.phoneNumber` on a string is `undefined`.
   */
  phoneNumbers: string[];
  weChatIds: string[];
  historicalNames: string[];
  followerCount: number;
  isFollowed: boolean;
  /** Withheld from public search and profile pages. Only moderators ever see this true. */
  isHidden?: boolean;
}


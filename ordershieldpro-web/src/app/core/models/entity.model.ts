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
  /** Other names the entity is known by — public, and how a rebrand stays traceable. */
  alternativeNames?: string[];
  /**
   * Moderators only — the API sends this empty to everyone else, so it needs no UI guard.
   * Search still matches on phone numbers for all callers; what is withheld is listing
   * them back. An empty array does not mean the entity has no numbers on file.
   */
  phoneNumbers?: string[];
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
   *
   * `phoneNumbers` and `weChatIds` arrive **empty for non-moderators** — the API withholds
   * contact details rather than relying on the UI to hide them. Don't render them without
   * an admin check, and don't treat "empty" as "this entity has none".
   */
  phoneNumbers: string[];
  weChatIds: string[];
  historicalNames: string[];
  followerCount: number;
  isFollowed: boolean;
  /** Withheld from public search and profile pages. Only moderators ever see this true. */
  isHidden?: boolean;
}


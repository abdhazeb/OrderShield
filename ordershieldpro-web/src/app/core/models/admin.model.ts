import { AdminActionStatus, AdminActionType, EntityType, ReviewerType, ReviewStatus, SeverityLevel } from '../enums';

export interface PendingReview {
  id: string;
  tradeEntityId: string;
  tradeEntityName: string;
  reviewerId: string;
  reviewerName?: string;
  reviewerType: ReviewerType;
  title: string;
  severity: SeverityLevel;
  status: ReviewStatus;
  narrative: string;
  product?: string;
  productCategory?: string;
  incidentDate: string;
  orderValue?: number;
  evidenceLinks?: string;
  /** JSON string (ReviewPendingEdit) when status === PendingEdit */
  pendingEditJson?: string;
  evidenceFiles: { id: string; fileName: string; contentType: string; fileSizeBytes: number }[];
  publicEvidenceNotes: { id: string; summary: string; verificationOutcome: number; createdAt: string }[];
  createdAt: string;
}

/** A review a moderator withdrew from public view — Admin → Hidden Content. */
export interface HiddenReview {
  id: string;
  tradeEntityId: string;
  tradeEntityName: string;
  reviewerId: string;
  reviewerName?: string;
  reviewerType: ReviewerType;
  title: string;
  severity: SeverityLevel;
  status: ReviewStatus;
  narrative: string;
  createdAt: string;
  updatedAt?: string;
  updatedByName?: string;
}

/** An entity a moderator withdrew from public search/profile — Admin → Hidden Content. */
export interface HiddenEntity {
  id: string;
  legalName: string;
  tradeName?: string;
  entityType: EntityType;
  country: string;
  totalReviewCount: number;
  hiddenAt?: string;
  hiddenByName?: string;
}

/** Result of a bulk entity import from an uploaded spreadsheet. */
export interface EntityImportResult {
  totalRows: number;
  created: number;
  skippedDuplicates: number;
  skippedInvalid: number;
}

export interface PendingAction {
  id: string;
  actionType: AdminActionType;
  targetType: string;
  targetId: string;
  payload?: string;
  proposedById: string;
  proposedByName?: string;
  status: AdminActionStatus;
  reviewedById?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

export interface AnalyticsSummary {
  totalReviews: number;
  pendingReviews: number;
  publishedReviews: number;
  avgTurnaroundHours: number;
  totalEntities: number;
  verificationRate: number;
}

export interface ContactMsg {
  id: string;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  userId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

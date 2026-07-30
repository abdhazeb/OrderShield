import { ReviewerType, ReviewStatus, SeverityLevel, VerificationStatus } from '../enums';

export interface Review {
  id: string;
  tradeEntityId: string;
  tradeEntityName?: string;
  reviewerId: string;
  reviewerType: ReviewerType;
  transactionRole: string;
  severity: SeverityLevel;
  status: ReviewStatus;
  title: string;
  narrative: string;
  product?: string;
  productCategory?: string;
  incidentDate: string;
  orderValue?: number;
  contactName?: string;
  /** The contact's role at the entity (owner, purchasing manager, …). */
  contactPosition?: string;
  contactPhoneUsed?: string;
  contactWeChatUsed?: string;
  evidenceLinks?: string;
  /** JSON string (ReviewPendingEdit) when status === PendingEdit */
  pendingEditJson?: string;
  verificationEmail: string;
  createdAt: string;
  evidenceFiles: EvidenceFile[];
  evidenceNotes: EvidenceNote[];
}

/**
 * The minimum an evidence file needs for the app to address, label, and render it.
 * `EvidenceViewerComponent` takes this rather than a fuller shape so the same viewer works
 * with every list DTO that carries attachments.
 */
export interface EvidenceFileRef {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
}

export interface EvidenceFile extends EvidenceFileRef {
  filePath?: string;
  uploadedAt?: string;
}

export interface EvidenceNote {
  id: string;
  reviewId: string;
  authoredById: string;
  summary: string;
  verificationOutcome: VerificationStatus;
  isPubliclyVisible: boolean;
  createdAt: string;
}

/**
 * The review's stored values for prefilling the edit form (`GET /api/reviews/{id}/edit`).
 * The edit form loads from here rather than from a list DTO, because the list DTOs omit the
 * contact fields and a form primed from one would submit them blank.
 */
export interface ReviewEdit {
  id: string;
  tradeEntityId: string;
  tradeEntityName: string;
  status: ReviewStatus;
  severity: SeverityLevel;
  isComment: boolean;

  title: string;
  narrative: string;
  product?: string;
  productCategory?: string;
  incidentDate?: string;

  contactName?: string;
  contactPosition?: string;
  contactPhoneUsed?: string;
}

/**
 * Full submission detail for the moderator dossier screen
 * (`GET /api/reviews/{id}/moderation`). Carries reviewer contact details that never
 * appear on the public timeline, so it is only fetched by moderators.
 */
export interface ReviewModeration {
  id: string;
  status: ReviewStatus;
  severity: SeverityLevel;
  isComment: boolean;

  tradeEntityId: string;
  tradeEntityName: string;
  tradeEntityCountry?: string;
  tradeEntityRegion?: string;
  tradeEntityVerificationStatus: VerificationStatus;
  tradeEntityIsHidden: boolean;
  tradeEntityTotalReviewCount: number;

  reviewerId: string;
  reviewerName?: string;
  reviewerEmail?: string;
  reviewerType: ReviewerType;
  transactionRole: string;
  verificationEmail: string;

  title: string;
  narrative: string;
  product?: string;
  productCategory?: string;
  incidentDate?: string;
  orderValue?: number;

  contactName?: string;
  contactPosition?: string;
  contactPhoneUsed?: string;
  contactWeChatUsed?: string;

  evidenceLinks?: string;
  evidenceFiles: EvidenceFile[];
  evidenceNotes: ModerationNote[];

  pendingEditJson?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ModerationNote {
  id: string;
  summary: string;
  verificationOutcome: VerificationStatus;
  isPubliclyVisible: boolean;
  authoredByName?: string;
  createdAt: string;
}

export interface CreateReviewRequest {
  tradeEntityId: string;
  reviewerType: ReviewerType;
  transactionRole: string;
  severity: SeverityLevel;
  title: string;
  narrative: string;
  product?: string;
  productCategory?: string;
  incidentDate: string;
  orderValue?: number;
  contactPhoneUsed?: string;
  contactWeChatUsed?: string;
  evidenceLinks?: string;
  verificationEmail: string;
}

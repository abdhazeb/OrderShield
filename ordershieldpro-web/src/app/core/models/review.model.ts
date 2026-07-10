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

export interface EvidenceFile {
  id: string;
  fileName: string;
  filePath: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
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

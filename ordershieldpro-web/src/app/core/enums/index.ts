export enum EntityType {
  Supplier = 0,
  Broker = 1
}

export enum ReviewerType {
  Broker = 0,
  Buyer = 1
}

export enum SeverityLevel {
  Info = 0,
  Warning = 1,
  Critical = 2,
  Behavior = 3,
  Fraud = 4,
  Quality = 5,
  Delivery = 6,
  Payment = 7,
  FinanciallyDistressed = 8,
  Bankrupt = 9,
  PoorManagement = 10,
  InaccurateAppointments = 11,
  BribeOthers = 12,
  FakeSupplier = 13,
  Other = 14
}

export enum ReviewStatus {
  Pending = 0,
  Published = 1,
  Amended = 2,
  Rejected = 3
}

export enum VerificationStatus {
  Unverified = 0,
  Verified = 1,
  Clarified = 2,
  Insufficient = 3
}

export enum UserRole {
  Broker = 0,
  Buyer = 1,
  ServiceTeam = 2,
  Admin = 3,
  SuperAdmin = 4
}

export enum SubscriptionTier {
  Free = 0,
  Pro = 1
}

export enum Language {
  En = 0,
  Ar = 1,
  Zh = 2
}

export enum InvestigationStatus {
  Pending = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3
}

export enum NotificationType {
  NewReviewOnFollowedEntity = 0,
  ReviewStatusChanged = 1,
  InvestigationComplete = 2,
  WatchRequestResolved = 3,
  EnquiryReply = 4,
  AdminActionApproved = 5,
  AdminActionRejected = 6
}

export enum AdminActionType {
  PublishReview = 0,
  RejectReview = 1,
  EditReview = 2,
  DeleteReview = 3,
  ReplyEnquiry = 4
}

export enum AdminActionStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Withdrawn = 3
}

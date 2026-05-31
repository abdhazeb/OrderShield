namespace OrderShieldPro.Domain.Enums;

public enum NotificationType
{
    NewReviewOnFollowedEntity = 0,
    ReviewStatusChanged = 1,
    InvestigationComplete = 2,
    WatchRequestResolved = 3,
    EnquiryReply = 4,
    AdminActionApproved = 5,
    AdminActionRejected = 6,
    // SuperAdmin-facing alerts (something needs a decision):
    NewUserPendingApproval = 7,
    NewReviewPendingApproval = 8,
    NewWatchRequestPendingReview = 9,
    // User-facing outcomes:
    UserAccountApproved = 10,
    ReviewApproved = 11,
    ReviewRejected = 12,
    WatchRequestAccepted = 13,
    WatchRequestRejected = 14
}

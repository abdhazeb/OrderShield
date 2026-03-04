namespace OrderShieldPro.Domain.Enums;

public enum NotificationType
{
    NewReviewOnFollowedEntity = 0,
    ReviewStatusChanged = 1,
    InvestigationComplete = 2,
    WatchRequestResolved = 3,
    EnquiryReply = 4,
    AdminActionApproved = 5,
    AdminActionRejected = 6
}

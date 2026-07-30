using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderShieldPro.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Data-only migration: backfills TemplateKey/Subject on Notification rows created
    /// before 20260727051758_AddNotificationTemplateFields added those columns.
    ///
    /// Every notification type that is created with a TemplateKey today (see
    /// UpdateReviewStatusCommandHandler, NotificationService, AdminController,
    /// CreateWatchRequestCommandHandler, IdentityService) was, before that migration,
    /// created with only an English Title/Message. Those older rows have TemplateKey IS
    /// NULL and are permanently stuck rendering their stored English text — the frontend
    /// falls back to Title/Message whenever TemplateKey is absent, by design, for the one
    /// case that is genuinely free text (a moderator's direct message via
    /// AdminController's "Admin message regarding your review", Type ReviewStatusChanged,
    /// which this migration deliberately never touches).
    ///
    /// For every other affected type the template is fully determined by Type, and the
    /// {{subject}} the template needs (a review title, an entity name, a user's name) was
    /// already embedded — quoted — in the old Message text, so it can be recovered instead
    /// of left blank. Two types (NewReviewPendingApproval, EnquiryReply) are reused for more
    /// than one template depending on context, so those are disambiguated by matching the
    /// distinguishing phrase in the stored Message rather than by Type alone.
    ///
    /// Idempotent: every UPDATE is scoped to TemplateKey IS NULL, so re-running this
    /// (or applying it against a database that already has correctly-tagged rows) changes
    /// nothing further.
    /// </summary>
    public partial class BackfillNotificationTemplateKeys : Migration
    {
        // Extracts the text between the first pair of double quotes in Message — every
        // affected template embeds its {{subject}} that way (`Your review "X" ...`).
        private const string QuotedSubject =
            "SUBSTRING(Message, CHARINDEX('\"', Message) + 1, " +
            "CHARINDEX('\"', Message, CHARINDEX('\"', Message) + 1) - CHARINDEX('\"', Message) - 1)";

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Unambiguous: Type alone determines the template ────────────────────────

            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'reviewApproved', Subject = {QuotedSubject}
                WHERE Type = 'ReviewApproved' AND TemplateKey IS NULL AND Message LIKE '%""%""%';");

            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'reviewRejected', Subject = {QuotedSubject}
                WHERE Type = 'ReviewRejected' AND TemplateKey IS NULL AND Message LIKE '%""%""%';");

            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'newEnquiryPendingReview', Subject = {QuotedSubject}
                WHERE Type = 'NewWatchRequestPendingReview' AND TemplateKey IS NULL AND Message LIKE '%""%""%';");

            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'enquiryAccepted', Subject = {QuotedSubject}
                WHERE Type = 'WatchRequestAccepted' AND TemplateKey IS NULL AND Message LIKE '%""%""%';");

            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'enquiryRejected', Subject = {QuotedSubject}
                WHERE Type = 'WatchRequestRejected' AND TemplateKey IS NULL AND Message LIKE '%""%""%';");

            migrationBuilder.Sql(@"
                UPDATE Notifications
                SET TemplateKey = 'userAccountApproved'
                WHERE Type = 'UserAccountApproved' AND TemplateKey IS NULL;");

            // newUserPendingApproval's old Message has no quotes ('{name} ({email})
            // registered and is waiting for approval.') — recover the subject as everything
            // before the fixed trailing phrase instead.
            migrationBuilder.Sql(@"
                UPDATE Notifications
                SET TemplateKey = 'newUserPendingApproval',
                    Subject = LEFT(Message, CHARINDEX(' registered and is waiting for approval.', Message) - 1)
                WHERE Type = 'NewUserPendingApproval' AND TemplateKey IS NULL
                  AND Message LIKE '% registered and is waiting for approval.%';");

            // ── Ambiguous: same Type, different template depending on old Message text ──

            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'newReviewPendingApproval', Subject = {QuotedSubject}
                WHERE Type = 'NewReviewPendingApproval' AND TemplateKey IS NULL
                  AND Message LIKE '%was submitted and needs moderation.%';");

            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'reviewEditPendingApproval', Subject = {QuotedSubject}
                WHERE Type = 'NewReviewPendingApproval' AND TemplateKey IS NULL
                  AND Message LIKE '%has a pending edit that needs approval.%';");

            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'editedReviewNeedsReModeration', Subject = {QuotedSubject}
                WHERE Type = 'NewReviewPendingApproval' AND TemplateKey IS NULL
                  AND Message LIKE '%was edited and needs re-moderation.%';");

            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'enquiryReplyToRequester', Subject = {QuotedSubject}
                WHERE Type = 'EnquiryReply' AND TemplateKey IS NULL
                  AND Message LIKE 'Your enquiry about%has been answered.%';");

            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'enquiryReplyToSubscriber', Subject = {QuotedSubject}
                WHERE Type = 'EnquiryReply' AND TemplateKey IS NULL
                  AND Message LIKE 'The enquiry about%that you subscribed to has been answered.%';");

            // Type = EnquiryReply also covers ResolveWatchRequestCommandHandler's
            // "enquiryResolvedSubscriber" ("Supplier Enquiry Complete" /
            // "The enquiry about ... has been resolved."), distinguished from the reply
            // templates above by "resolved" vs "answered".
            migrationBuilder.Sql($@"
                UPDATE Notifications
                SET TemplateKey = 'enquiryResolvedSubscriber', Subject = {QuotedSubject}
                WHERE Type = 'EnquiryReply' AND TemplateKey IS NULL
                  AND Message LIKE '%that you subscribed to has been resolved.%';");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Best-effort revert: un-tag exactly the rows this migration tagged, identified
            // by the literal TemplateKey values it assigns above. Title/Message (the actual
            // stored content) were never modified, so this cannot lose data — it only
            // returns those rows to their pre-migration English-only fallback.
            migrationBuilder.Sql(@"
                UPDATE Notifications
                SET TemplateKey = NULL, Subject = NULL
                WHERE TemplateKey IN (
                    'reviewApproved', 'reviewRejected', 'newEnquiryPendingReview',
                    'enquiryAccepted', 'enquiryRejected', 'userAccountApproved',
                    'newUserPendingApproval', 'newReviewPendingApproval',
                    'reviewEditPendingApproval', 'editedReviewNeedsReModeration',
                    'enquiryReplyToRequester', 'enquiryReplyToSubscriber',
                    'enquiryResolvedSubscriber'
                );");
        }
    }
}

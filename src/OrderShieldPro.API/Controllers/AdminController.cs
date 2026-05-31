using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Infrastructure.Identity;
using System.Text.Json;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
public class AdminController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IIdentityService _identityService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly INotificationService _notificationService;

    public AdminController(
        IApplicationDbContext context,
        IIdentityService identityService,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        INotificationService notificationService)
    {
        _context = context;
        _identityService = identityService;
        _userManager = userManager;
        _roleManager = roleManager;
        _notificationService = notificationService;
    }

    private string? CurrentUserId => User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    private bool IsSuperAdmin => User.IsInRole("SuperAdmin");

    /// <summary>
    /// Get dashboard statistics for internal analytics.
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken ct)
    {
        var totalEntities = await _context.TradeEntities.CountAsync(ct);
        var totalReviews = await _context.Reviews.CountAsync(ct);
        var pendingReviews = await _context.Reviews.CountAsync(r => r.Status == ReviewStatus.Pending, ct);
        var publishedReviews = await _context.Reviews.CountAsync(r => r.Status == ReviewStatus.Published, ct);
        var totalUsers = 0; // Would need UserManager — simplified for now
        var totalWatchRequests = await _context.WatchRequests.CountAsync(ct);
        var pendingWatchRequests = await _context.WatchRequests.CountAsync(w => w.Status == InvestigationStatus.Pending, ct);

        var severityCounts = new
        {
            info = await _context.Reviews.CountAsync(r => r.Severity == SeverityLevel.Info && r.Status == ReviewStatus.Published, ct),
            warning = await _context.Reviews.CountAsync(r => r.Severity == SeverityLevel.Warning && r.Status == ReviewStatus.Published, ct),
            critical = await _context.Reviews.CountAsync(r => r.Severity == SeverityLevel.Critical && r.Status == ReviewStatus.Published, ct)
        };

        return Ok(new
        {
            totalEntities,
            totalReviews,
            pendingReviews,
            publishedReviews,
            totalUsers,
            totalWatchRequests,
            pendingWatchRequests,
            severityCounts
        });
    }

    /// <summary>
    /// Get submission statistics (volume, turnaround times).
    /// </summary>
    [HttpGet("submission-stats")]
    public async Task<IActionResult> GetSubmissionStats(CancellationToken ct)
    {
        var last30Days = DateTime.UtcNow.AddDays(-30);

        var recentSubmissions = await _context.Reviews
            .Where(r => r.CreatedAt >= last30Days)
            .CountAsync(ct);

        var recentPublished = await _context.Reviews
            .Where(r => r.Status == ReviewStatus.Published && r.UpdatedAt >= last30Days)
            .CountAsync(ct);

        // Average turnaround: time from creation to publish
        var publishedReviewDates = await _context.Reviews
            .Where(r => r.Status == ReviewStatus.Published && r.UpdatedAt.HasValue)
            .Select(r => new { r.CreatedAt, UpdatedAt = r.UpdatedAt!.Value })
            .ToListAsync(ct);

        var avgTurnaroundHours = publishedReviewDates.Count > 0
            ? Math.Round(publishedReviewDates.Average(r => (r.UpdatedAt - r.CreatedAt).TotalHours), 1)
            : 0;

        var submissionsByDay = await _context.Reviews
            .Where(r => r.CreatedAt >= last30Days)
            .GroupBy(r => r.CreatedAt.Date)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync(ct);

        return Ok(new
        {
            recentSubmissions,
            recentPublished,
            averageTurnaroundHours = Math.Round(avgTurnaroundHours, 1),
            submissionsByDay
        });
    }

    /// <summary>
    /// Combined analytics endpoint for Admin Dashboard.
    /// Returns counts, turnaround, and verification rate in a single call.
    /// </summary>
    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(CancellationToken ct)
    {
        var totalReviews = await _context.Reviews.CountAsync(ct);
        var pendingReviews = await _context.Reviews.CountAsync(r => r.Status == ReviewStatus.Pending, ct);
        var publishedReviews = await _context.Reviews.CountAsync(r => r.Status == ReviewStatus.Published, ct);
        var totalEntities = await _context.TradeEntities.CountAsync(ct);

        var publishedWithDates = await _context.Reviews
            .Where(r => r.Status == ReviewStatus.Published && r.UpdatedAt.HasValue)
            .Select(r => new { r.CreatedAt, UpdatedAt = r.UpdatedAt!.Value })
            .ToListAsync(ct);

        var avgTurnaroundHours = publishedWithDates.Count > 0
            ? Math.Round(publishedWithDates.Average(r => (r.UpdatedAt - r.CreatedAt).TotalHours), 1)
            : 0;

        var verifiedEntities = await _context.TradeEntities
            .CountAsync(e => e.VerificationStatus == VerificationStatus.Verified
                          || e.VerificationStatus == VerificationStatus.Clarified, ct);

        var verificationRate = totalEntities > 0
            ? Math.Round(100.0 * verifiedEntities / totalEntities, 1)
            : 0;

        return Ok(new
        {
            totalReviews,
            pendingReviews,
            publishedReviews,
            avgTurnaroundHours = Math.Round(avgTurnaroundHours, 1),
            totalEntities,
            verificationRate
        });
    }

    /// <summary>
    /// Send a notification/message to a reviewer about their review.
    /// The admin can request more details or share feedback.
    /// </summary>
    [HttpPost("reviews/{reviewId:guid}/message")]
    public async Task<IActionResult> MessageReviewer(Guid reviewId, [FromBody] AdminMessageRequest request, CancellationToken ct)
    {
        var review = await _context.Reviews
            .FirstOrDefaultAsync(r => r.Id == reviewId, ct);

        if (review is null)
            return NotFound(new { errors = new[] { "Review not found." } });

        // Create a notification for the reviewer
        var notification = new Notification
        {
            UserId = review.ReviewerId,
            Type = NotificationType.ReviewStatusChanged,
            Title = $"Admin message regarding your review: {review.Title}",
            Message = request.Message,
            ReferenceReviewId = reviewId,
            ReferenceEntityId = review.TradeEntityId,
            IsRead = false
        };

        _context.Notifications.Add(notification);

        // Optionally add an internal evidence note for audit trail
        if (request.AddAsNote)
        {
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
            var note = new EvidenceNote
            {
                ReviewId = reviewId,
                AuthoredById = currentUserId,
                Summary = $"[Admin Message] {request.Message}",
                VerificationOutcome = VerificationStatus.Unverified,
                IsPubliclyVisible = false
            };
            _context.EvidenceNotes.Add(note);
        }

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Message sent to reviewer" });
    }

    public record AdminMessageRequest(string Message, bool AddAsNote = true);

    // ==================== PENDING ADMIN ACTIONS (APPROVAL QUEUE) ====================

    /// <summary>
    /// Propose an admin action (publish/reject/edit/delete review). If SuperAdmin, execute directly.
    /// </summary>
    [HttpPost("actions/propose")]
    public async Task<IActionResult> ProposeAction([FromBody] ProposeActionRequest request, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            // Execute directly
            return await ExecuteAdminAction(request.ActionType, request.TargetType, request.TargetId, request.Payload, ct);
        }

        // Queue for approval
        _context.PendingAdminActions.Add(new PendingAdminAction
        {
            ActionType = request.ActionType,
            TargetType = request.TargetType,
            TargetId = request.TargetId,
            Payload = request.Payload,
            ProposedById = CurrentUserId!,
            Status = AdminActionStatus.Pending
        });
        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Action queued for SuperAdmin approval.", queued = true });
    }

    public record ProposeActionRequest(AdminActionType ActionType, string TargetType, Guid TargetId, string? Payload);

    /// <summary>
    /// Get all pending actions (SuperAdmin sees all, Admin sees own).
    /// </summary>
    [HttpGet("actions/pending")]
    public async Task<IActionResult> GetPendingActions([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        var query = IsSuperAdmin
            ? _context.PendingAdminActions.AsQueryable()
            : _context.PendingAdminActions.Where(a => a.ProposedById == CurrentUserId);

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var proposerIds = items.Select(i => i.ProposedById).Distinct();
        var nameMap = await _identityService.GetUserDisplayNamesAsync(proposerIds, ct);

        var enriched = items.Select(a => new
        {
            a.Id,
            ActionType = a.ActionType.ToString(),
            a.TargetType,
            a.TargetId,
            a.Payload,
            a.ProposedById,
            ProposedByName = nameMap.GetValueOrDefault(a.ProposedById),
            Status = a.Status.ToString(),
            a.ReviewedById,
            a.ReviewedAt,
            a.CreatedAt
        });

        return Ok(new { items = enriched, totalCount, page, pageSize });
    }

    /// <summary>
    /// Get count of pending actions (for badge).
    /// </summary>
    [HttpGet("actions/pending-count")]
    public async Task<IActionResult> GetPendingActionCount(CancellationToken ct)
    {
        var count = await _context.PendingAdminActions
            .CountAsync(a => a.Status == AdminActionStatus.Pending, ct);
        return Ok(new { count });
    }

    /// <summary>
    /// Approve a pending action (SuperAdmin only).
    /// </summary>
    [HttpPut("actions/{id:guid}/approve")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> ApproveAction(Guid id, CancellationToken ct)
    {
        var action = await _context.PendingAdminActions.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (action is null) return NotFound();
        if (action.Status != AdminActionStatus.Pending)
            return BadRequest(new { errors = new[] { "Action is no longer pending." } });

        // Execute the action
        var execResult = await ExecuteAdminAction(action.ActionType, action.TargetType, action.TargetId, action.Payload, ct);

        action.Status = AdminActionStatus.Approved;
        action.ReviewedById = CurrentUserId;
        action.ReviewedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return Ok(new { message = "Action approved and executed." });
    }

    /// <summary>
    /// Reject a pending action (SuperAdmin only).
    /// </summary>
    [HttpPut("actions/{id:guid}/reject")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> RejectAction(Guid id, CancellationToken ct)
    {
        var action = await _context.PendingAdminActions.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (action is null) return NotFound();
        if (action.Status != AdminActionStatus.Pending)
            return BadRequest(new { errors = new[] { "Action is no longer pending." } });

        action.Status = AdminActionStatus.Rejected;
        action.ReviewedById = CurrentUserId;
        action.ReviewedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return Ok(new { message = "Action rejected." });
    }

    /// <summary>
    /// Withdraw own pending action (Admin).
    /// </summary>
    [HttpPut("actions/{id:guid}/withdraw")]
    public async Task<IActionResult> WithdrawAction(Guid id, CancellationToken ct)
    {
        var action = await _context.PendingAdminActions.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (action is null) return NotFound();
        if (action.ProposedById != CurrentUserId)
            return Forbid();
        if (action.Status != AdminActionStatus.Pending)
            return BadRequest(new { errors = new[] { "Action is no longer pending." } });

        action.Status = AdminActionStatus.Withdrawn;
        await _context.SaveChangesAsync(ct);

        return Ok(new { message = "Action withdrawn." });
    }

    private async Task<IActionResult> ExecuteAdminAction(AdminActionType actionType, string targetType, Guid targetId, string? payload, CancellationToken ct)
    {
        switch (actionType)
        {
            case AdminActionType.PublishReview:
            {
                var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == targetId, ct);
                if (review is null) return NotFound();
                review.Status = ReviewStatus.Published;
                await _context.SaveChangesAsync(ct);
                return Ok(new { message = "Review published." });
            }
            case AdminActionType.RejectReview:
            {
                var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == targetId, ct);
                if (review is null) return NotFound();
                review.Status = ReviewStatus.Rejected;
                await _context.SaveChangesAsync(ct);
                return Ok(new { message = "Review rejected." });
            }
            case AdminActionType.DeleteReview:
            {
                var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == targetId, ct);
                if (review is null) return NotFound();
                _context.Reviews.Remove(review);
                await _context.SaveChangesAsync(ct);
                return Ok(new { message = "Review deleted." });
            }
            case AdminActionType.EditReview:
            {
                var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == targetId, ct);
                if (review is null) return NotFound();
                if (payload is not null)
                {
                    var edit = JsonSerializer.Deserialize<ReviewEditPayload>(payload);
                    if (edit?.Title is not null) review.Title = edit.Title;
                    if (edit?.Narrative is not null) review.Narrative = edit.Narrative;
                }
                await _context.SaveChangesAsync(ct);
                return Ok(new { message = "Review updated." });
            }
            case AdminActionType.ReplyEnquiry:
            {
                var wr = await _context.WatchRequests.Include(w => w.Subscribers).FirstOrDefaultAsync(w => w.Id == targetId, ct);
                if (wr is null) return NotFound();
                if (payload is not null)
                {
                    var reply = JsonSerializer.Deserialize<EnquiryReplyPayload>(payload);
                    wr.ReplyMessage = reply?.ReplyMessage;
                    wr.ServiceTeamNotes = reply?.ServiceTeamNotes ?? wr.ServiceTeamNotes;
                }
                wr.RepliedAt = DateTime.UtcNow;
                wr.Status = InvestigationStatus.Completed;
                wr.ResolvedDate = DateTime.UtcNow;

                _context.Notifications.Add(new Notification
                {
                    UserId = wr.RequestedById,
                    Type = NotificationType.EnquiryReply,
                    Title = "Supplier Enquiry Reply",
                    Message = $"Your enquiry about \"{wr.EntityName}\" has been answered.",
                    IsRead = false
                });
                foreach (var sub in wr.Subscribers)
                {
                    _context.Notifications.Add(new Notification
                    {
                        UserId = sub.UserId,
                        Type = NotificationType.EnquiryReply,
                        Title = "Supplier Enquiry Reply",
                        Message = $"The enquiry about \"{wr.EntityName}\" that you subscribed to has been answered.",
                        IsRead = false
                    });
                }
                await _context.SaveChangesAsync(ct);
                return Ok(new { message = "Enquiry reply sent." });
            }
            default:
                return BadRequest(new { errors = new[] { "Unknown action type." } });
        }
    }

    private record ReviewEditPayload(string? Title, string? Narrative);
    private record EnquiryReplyPayload(string? ReplyMessage, string? ServiceTeamNotes);

    // ==================== SYSTEM SETTINGS (SuperAdmin only) ====================

    /// <summary>
    /// Get all system settings.
    /// </summary>
    [HttpGet("settings")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
    {
        var settings = await _context.SystemSettings
            .OrderBy(s => s.Key)
            .Select(s => new { s.Id, s.Key, s.Value, s.Description, s.UpdatedAt })
            .ToListAsync(ct);
        return Ok(settings);
    }

    /// <summary>
    /// Update a system setting by key.
    /// </summary>
    [HttpPut("settings")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateSetting([FromBody] UpdateSettingRequest request, CancellationToken ct)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == request.Key, ct);

        if (setting is null)
        {
            // Create new
            _context.SystemSettings.Add(new SystemSetting
            {
                Key = request.Key,
                Value = request.Value,
                Description = request.Description,
                UpdatedById = CurrentUserId
            });
        }
        else
        {
            setting.Value = request.Value;
            if (request.Description is not null) setting.Description = request.Description;
            setting.UpdatedById = CurrentUserId;
        }

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Setting updated." });
    }

    public record UpdateSettingRequest(string Key, string Value, string? Description = null);

    // ==================== TEAM MANAGEMENT (SuperAdmin only) ====================

    /// <summary>
    /// Get all admin/superadmin team members.
    /// </summary>
    [HttpGet("team")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetTeam(CancellationToken ct)
    {
        var admins = await _userManager.Users
            .Where(u => u.Role == UserRole.Admin || u.Role == UserRole.SuperAdmin)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                Role = u.Role.ToString(),
                u.IsActive,
                u.CreatedAt,
                u.UpdatedAt
            })
            .OrderBy(u => u.CreatedAt)
            .ToListAsync(ct);

        return Ok(admins);
    }

    /// <summary>
    /// Register a new admin (SuperAdmin only).
    /// </summary>
    [HttpPost("team")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminRequest request, CancellationToken ct)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
            return BadRequest(new { errors = new[] { "A user with this email already exists." } });

        var role = request.IsSuperAdmin ? UserRole.SuperAdmin : UserRole.Admin;
        var roleName = role.ToString();

        // Ensure role exists
        if (!await _roleManager.RoleExistsAsync(roleName))
            await _roleManager.CreateAsync(new IdentityRole(roleName));

        var user = new ApplicationUser
        {
            FullName = request.FullName,
            Email = request.Email,
            UserName = request.Email,
            EmailConfirmed = true,
            Role = role,
            SubscriptionTier = SubscriptionTier.Pro,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await _userManager.AddToRoleAsync(user, roleName);

        return Created(string.Empty, new { id = user.Id, message = "Admin created successfully." });
    }

    public record CreateAdminRequest(string FullName, string Email, string Password, bool IsSuperAdmin = false);

    /// <summary>
    /// Freeze or unfreeze an admin account (SuperAdmin only).
    /// </summary>
    [HttpPut("team/{userId}/toggle-active")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> ToggleAdminActive(string userId, CancellationToken ct)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound();
        if (user.Id == CurrentUserId)
            return BadRequest(new { errors = new[] { "You cannot freeze your own account." } });

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return Ok(new { isActive = user.IsActive, message = user.IsActive ? "Account activated." : "Account frozen." });
    }

    /// <summary>
    /// Delete an admin account (SuperAdmin only).
    /// </summary>
    [HttpDelete("team/{userId}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteAdmin(string userId, CancellationToken ct)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound();
        if (user.Id == CurrentUserId)
            return BadRequest(new { errors = new[] { "You cannot delete your own account." } });

        await _userManager.DeleteAsync(user);
        return Ok(new { message = "Admin deleted." });
    }

    // ==================== USER REGISTRATION APPROVALS (SuperAdmin only) ====================

    /// <summary>
    /// List public user registrations awaiting SuperAdmin approval.
    /// (Buyer-role accounts created via /auth/register are inactive until approved.)
    /// </summary>
    [HttpGet("users/pending")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetPendingUsers(CancellationToken ct)
    {
        var pending = await _userManager.Users
            .Where(u => !u.IsActive && u.Role == UserRole.Buyer)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.PhoneNumber,
                u.Organization,
                Role = u.Role.ToString(),
                Language = u.LanguagePreference.ToString(),
                u.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(new { items = pending, totalCount = pending.Count });
    }

    /// <summary>
    /// Count of pending user registrations (for the admin badge).
    /// </summary>
    [HttpGet("users/pending-count")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetPendingUserCount(CancellationToken ct)
    {
        var count = await _userManager.Users
            .CountAsync(u => !u.IsActive && u.Role == UserRole.Buyer, ct);
        return Ok(new { count });
    }

    /// <summary>
    /// Approve a pending user (activates the account so they can sign in).
    /// </summary>
    [HttpPut("users/{userId}/approve")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> ApproveUser(string userId, CancellationToken ct)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound();
        if (user.IsActive) return Ok(new { message = "User is already active." });

        user.IsActive = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        // Notify the user that their account is active and they can sign in.
        await _notificationService.NotifyUserAsync(
            user.Id,
            NotificationType.UserAccountApproved,
            "Account approved",
            "Your OrderShieldPro account has been approved. You can now sign in.",
            cancellationToken: ct);

        return Ok(new { message = "User approved." });
    }

    /// <summary>
    /// Reject a pending user (deletes the account).
    /// </summary>
    [HttpPut("users/{userId}/reject")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> RejectUser(string userId, CancellationToken ct)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound();
        if (user.IsActive)
            return BadRequest(new { errors = new[] { "User is already active and cannot be rejected." } });

        await _userManager.DeleteAsync(user);
        return Ok(new { message = "User rejected and removed." });
    }
}

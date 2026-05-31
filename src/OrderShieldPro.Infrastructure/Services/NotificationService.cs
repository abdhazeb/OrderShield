using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Infrastructure.Identity;

namespace OrderShieldPro.Infrastructure.Services;

/// <summary>
/// Persists in-app notifications. SaveChanges is performed inside this service
/// so callers don't need to coordinate the unit of work.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly IApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public NotificationService(IApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task NotifyUserAsync(
        string userId,
        NotificationType type,
        string title,
        string message,
        Guid? referenceEntityId = null,
        Guid? referenceReviewId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return;

        _context.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            ReferenceEntityId = referenceEntityId,
            ReferenceReviewId = referenceReviewId,
            IsRead = false
        });

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task NotifySuperAdminsAsync(
        NotificationType type,
        string title,
        string message,
        Guid? referenceEntityId = null,
        Guid? referenceReviewId = null,
        CancellationToken cancellationToken = default)
    {
        var superAdminIds = await _userManager.Users
            .Where(u => u.Role == UserRole.SuperAdmin && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        if (superAdminIds.Count == 0) return;

        foreach (var id in superAdminIds)
        {
            _context.Notifications.Add(new Notification
            {
                UserId = id,
                Type = type,
                Title = title,
                Message = message,
                ReferenceEntityId = referenceEntityId,
                ReferenceReviewId = referenceReviewId,
                IsRead = false
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}

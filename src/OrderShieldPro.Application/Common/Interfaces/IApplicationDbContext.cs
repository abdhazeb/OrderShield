using OrderShieldPro.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace OrderShieldPro.Application.Common.Interfaces;

/// <summary>
/// Abstraction over the EF DbContext for use in Application layer handlers.
/// </summary>
public interface IApplicationDbContext
{
    DbSet<TradeEntity> TradeEntities { get; }
    DbSet<EntityPhoneNumber> EntityPhoneNumbers { get; }
    DbSet<EntityWeChatId> EntityWeChatIds { get; }
    DbSet<EntityHistoricalName> EntityHistoricalNames { get; }
    DbSet<Review> Reviews { get; }
    DbSet<ReviewEvidenceFile> ReviewEvidenceFiles { get; }
    DbSet<EvidenceNote> EvidenceNotes { get; }
    DbSet<WatchRequest> WatchRequests { get; }
    DbSet<WatchRequestSubscriber> WatchRequestSubscribers { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<SubscriptionPlan> SubscriptionPlans { get; }
    DbSet<SubscriptionRequest> SubscriptionRequests { get; }
    DbSet<UserFollowedEntity> UserFollowedEntities { get; }
    DbSet<SystemSetting> SystemSettings { get; }
    DbSet<PendingAdminAction> PendingAdminActions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Infrastructure.Identity;
using OrderShieldPro.Infrastructure.Persistence.Configurations;

namespace OrderShieldPro.Infrastructure.Persistence;

/// <summary>
/// Main EF Core DbContext for OrderShieldPro.
/// Extends IdentityDbContext for ASP.NET Core Identity integration.
/// </summary>
public class ApplicationDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<TradeEntity> TradeEntities => Set<TradeEntity>();
    public DbSet<EntityPhoneNumber> EntityPhoneNumbers => Set<EntityPhoneNumber>();
    public DbSet<EntityWeChatId> EntityWeChatIds => Set<EntityWeChatId>();
    public DbSet<EntityHistoricalName> EntityHistoricalNames => Set<EntityHistoricalName>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ReviewEvidenceFile> ReviewEvidenceFiles => Set<ReviewEvidenceFile>();
    public DbSet<EvidenceNote> EvidenceNotes => Set<EvidenceNote>();
    public DbSet<WatchRequest> WatchRequests => Set<WatchRequest>();
    public DbSet<WatchRequestSubscriber> WatchRequestSubscribers => Set<WatchRequestSubscriber>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<UserFollowedEntity> UserFollowedEntities => Set<UserFollowedEntity>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<PendingAdminAction> PendingAdminActions => Set<PendingAdminAction>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Apply all configurations from this assembly
        builder.ApplyConfiguration(new TradeEntityConfiguration());
        builder.ApplyConfiguration(new EntityPhoneNumberConfiguration());
        builder.ApplyConfiguration(new EntityWeChatIdConfiguration());
        builder.ApplyConfiguration(new EntityHistoricalNameConfiguration());
        builder.ApplyConfiguration(new ReviewConfiguration());
        builder.ApplyConfiguration(new ReviewEvidenceFileConfiguration());
        builder.ApplyConfiguration(new EvidenceNoteConfiguration());
        builder.ApplyConfiguration(new WatchRequestConfiguration());
        builder.ApplyConfiguration(new WatchRequestSubscriberConfiguration());
        builder.ApplyConfiguration(new NotificationConfiguration());
        builder.ApplyConfiguration(new SubscriptionPlanConfiguration());
        builder.ApplyConfiguration(new UserFollowedEntityConfiguration());
        builder.ApplyConfiguration(new ContactMessageConfiguration());
        builder.ApplyConfiguration(new ApplicationUserConfiguration());
        builder.ApplyConfiguration(new SystemSettingConfiguration());
        builder.ApplyConfiguration(new PendingAdminActionConfiguration());
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Auto-set UpdatedAt timestamps
        foreach (var entry in ChangeTracker.Entries<Domain.Common.BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}

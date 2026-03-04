using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Infrastructure.Identity;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.Property(e => e.FullName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(e => e.Region)
            .HasMaxLength(100);

        builder.Property(e => e.Role)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.LanguagePreference)
            .HasConversion<string>()
            .HasMaxLength(10);

        builder.Property(e => e.SubscriptionTier)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.NotificationPreferencesJson)
            .HasMaxLength(2000);

        builder.Property(e => e.RefreshToken)
            .HasMaxLength(500);

        // Followed entities: ApplicationUser -> UserFollowedEntity join table
        // The join table is configured in UserFollowedEntityConfiguration.
        // Here we just tell EF about the one-to-many from ApplicationUser side.
        builder.HasMany(e => e.FollowedEntities)
            .WithOne()
            .HasForeignKey(uf => uf.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Reviews authored by this user (one-to-many via ReviewerId string FK)
        builder.HasMany(e => e.Reviews)
            .WithOne()
            .HasForeignKey(r => r.ReviewerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Watch requests by this user
        builder.HasMany(e => e.WatchRequests)
            .WithOne()
            .HasForeignKey(wr => wr.RequestedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Notifications for this user
        builder.HasMany(e => e.Notifications)
            .WithOne()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

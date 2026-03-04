using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class WatchRequestSubscriberConfiguration : IEntityTypeConfiguration<WatchRequestSubscriber>
{
    public void Configure(EntityTypeBuilder<WatchRequestSubscriber> builder)
    {
        builder.ToTable("WatchRequestSubscribers");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.WatchRequestId).IsRequired();
        builder.Property(e => e.UserId).IsRequired().HasMaxLength(450);

        builder.HasOne(e => e.WatchRequest)
            .WithMany(w => w.Subscribers)
            .HasForeignKey(e => e.WatchRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WatchRequestId, e.UserId }).IsUnique();
    }
}

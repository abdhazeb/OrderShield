using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.UserId)
            .IsRequired()
            .HasMaxLength(450);

        builder.Property(e => e.Title)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(e => e.Message)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(e => e.Type)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.HasIndex(e => e.UserId);
        builder.HasIndex(e => new { e.UserId, e.IsRead });
        builder.HasIndex(e => e.CreatedAt);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class UserFollowedEntityConfiguration : IEntityTypeConfiguration<UserFollowedEntity>
{
    public void Configure(EntityTypeBuilder<UserFollowedEntity> builder)
    {
        builder.ToTable("UserFollowedEntities");

        // Composite primary key
        builder.HasKey(e => new { e.UserId, e.TradeEntityId });

        builder.Property(e => e.UserId)
            .IsRequired()
            .HasMaxLength(450);

        builder.HasIndex(e => e.UserId);
        builder.HasIndex(e => e.TradeEntityId);
    }
}

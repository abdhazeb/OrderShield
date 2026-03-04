using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class EntityWeChatIdConfiguration : IEntityTypeConfiguration<EntityWeChatId>
{
    public void Configure(EntityTypeBuilder<EntityWeChatId> builder)
    {
        builder.ToTable("EntityWeChatIds");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.WeChatId)
            .IsRequired()
            .HasMaxLength(100);

        // Index for searching entities by WeChat ID (BRD: scam prevention)
        builder.HasIndex(e => e.WeChatId);
    }
}

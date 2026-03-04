using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class TradeEntityConfiguration : IEntityTypeConfiguration<TradeEntity>
{
    public void Configure(EntityTypeBuilder<TradeEntity> builder)
    {
        builder.ToTable("TradeEntities");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.LegalName)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(e => e.TradeName)
            .HasMaxLength(500);

        builder.Property(e => e.Country)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.Region)
            .HasMaxLength(200);

        builder.Property(e => e.City)
            .HasMaxLength(200);

        builder.Property(e => e.ProductCategories)
            .HasMaxLength(1000);

        builder.Property(e => e.ExternalRegistryLinks)
            .HasMaxLength(4000);

        builder.Property(e => e.EntityType)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.VerificationStatus)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Indexes for search performance (BRD: search by name)
        builder.HasIndex(e => e.LegalName);
        builder.HasIndex(e => e.TradeName);
        builder.HasIndex(e => e.Country);
        builder.HasIndex(e => e.EntityType);
        builder.HasIndex(e => e.VerificationStatus);

        // Relationships
        builder.HasMany(e => e.PhoneNumbers)
            .WithOne(p => p.TradeEntity)
            .HasForeignKey(p => p.TradeEntityId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.WeChatIds)
            .WithOne(w => w.TradeEntity)
            .HasForeignKey(w => w.TradeEntityId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.HistoricalNames)
            .WithOne(h => h.TradeEntity)
            .HasForeignKey(h => h.TradeEntityId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.Reviews)
            .WithOne(r => r.TradeEntity)
            .HasForeignKey(r => r.TradeEntityId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(e => e.Followers)
            .WithOne(f => f.TradeEntity)
            .HasForeignKey(f => f.TradeEntityId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("Reviews");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.ReviewerId)
            .IsRequired()
            .HasMaxLength(450);

        builder.Property(e => e.Title)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(e => e.Narrative)
            .IsRequired()
            .HasMaxLength(5000);

        builder.Property(e => e.TransactionRole)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.Product)
            .HasMaxLength(300);

        builder.Property(e => e.ProductCategory)
            .HasMaxLength(200);

        builder.Property(e => e.OrderValue)
            .HasPrecision(18, 2);

        builder.Property(e => e.ContactPhoneUsed)
            .HasMaxLength(50);

        builder.Property(e => e.ContactWeChatUsed)
            .HasMaxLength(100);

        builder.Property(e => e.EvidenceLinks)
            .HasMaxLength(4000);

        builder.Property(e => e.VerificationEmail)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(e => e.ReviewerType)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.Severity)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Indexes
        builder.HasIndex(e => e.TradeEntityId);
        builder.HasIndex(e => e.ReviewerId);
        builder.HasIndex(e => e.Status);
        builder.HasIndex(e => e.Severity);
        builder.HasIndex(e => e.CreatedAt);

        // Relationships
        builder.HasMany(e => e.EvidenceFiles)
            .WithOne(f => f.Review)
            .HasForeignKey(f => f.ReviewId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.EvidenceNotes)
            .WithOne(n => n.Review)
            .HasForeignKey(n => n.ReviewId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

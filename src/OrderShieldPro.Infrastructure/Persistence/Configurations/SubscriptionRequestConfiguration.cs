using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class SubscriptionRequestConfiguration : IEntityTypeConfiguration<SubscriptionRequest>
{
    public void Configure(EntityTypeBuilder<SubscriptionRequest> builder)
    {
        builder.ToTable("SubscriptionRequests");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.UserId)
            .IsRequired()
            .HasMaxLength(450);

        builder.Property(e => e.RequestedTier)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.TotalAmount)
            .HasPrecision(18, 2);

        builder.Property(e => e.PaymentProofFileName)
            .HasMaxLength(255);

        builder.Property(e => e.PaymentProofStoragePath)
            .HasMaxLength(500);

        builder.Property(e => e.PaymentNotes)
            .HasMaxLength(1000);

        builder.Property(e => e.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.AdminNotes)
            .HasMaxLength(1000);

        builder.Property(e => e.ReviewedById)
            .HasMaxLength(450);

        builder.HasIndex(e => e.UserId);
        builder.HasIndex(e => e.Status);
    }
}

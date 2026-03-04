using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class PendingAdminActionConfiguration : IEntityTypeConfiguration<PendingAdminAction>
{
    public void Configure(EntityTypeBuilder<PendingAdminAction> builder)
    {
        builder.ToTable("PendingAdminActions");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.ActionType)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(e => e.TargetType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(e => e.TargetId).IsRequired();

        builder.Property(e => e.Payload)
            .HasMaxLength(8000);

        builder.Property(e => e.ProposedById)
            .IsRequired()
            .HasMaxLength(450);

        builder.Property(e => e.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.ReviewedById)
            .HasMaxLength(450);

        builder.HasIndex(e => e.Status);
        builder.HasIndex(e => e.ProposedById);
    }
}

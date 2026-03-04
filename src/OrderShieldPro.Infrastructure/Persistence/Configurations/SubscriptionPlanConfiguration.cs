using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class SubscriptionPlanConfiguration : IEntityTypeConfiguration<SubscriptionPlan>
{
    public void Configure(EntityTypeBuilder<SubscriptionPlan> builder)
    {
        builder.ToTable("SubscriptionPlans");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.Description)
            .HasMaxLength(500);

        builder.Property(e => e.MonthlyPrice)
            .HasPrecision(18, 2);

        builder.Property(e => e.Tier)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.FeaturesJson)
            .HasMaxLength(4000);

        builder.HasIndex(e => e.Tier).IsUnique();
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class EntityHistoricalNameConfiguration : IEntityTypeConfiguration<EntityHistoricalName>
{
    public void Configure(EntityTypeBuilder<EntityHistoricalName> builder)
    {
        builder.ToTable("EntityHistoricalNames");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.PreviousName)
            .IsRequired()
            .HasMaxLength(500);

        builder.HasIndex(e => e.PreviousName);
    }
}

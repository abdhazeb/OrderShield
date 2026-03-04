using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class EntityPhoneNumberConfiguration : IEntityTypeConfiguration<EntityPhoneNumber>
{
    public void Configure(EntityTypeBuilder<EntityPhoneNumber> builder)
    {
        builder.ToTable("EntityPhoneNumbers");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.PhoneNumber)
            .IsRequired()
            .HasMaxLength(50);

        // Index for searching entities by phone number (BRD: scam prevention)
        builder.HasIndex(e => e.PhoneNumber);
    }
}

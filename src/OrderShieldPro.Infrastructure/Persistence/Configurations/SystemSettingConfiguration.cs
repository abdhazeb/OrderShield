using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class SystemSettingConfiguration : IEntityTypeConfiguration<SystemSetting>
{
    public void Configure(EntityTypeBuilder<SystemSetting> builder)
    {
        builder.ToTable("SystemSettings");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Key)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.Value)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(e => e.Description)
            .HasMaxLength(500);

        builder.Property(e => e.UpdatedById)
            .HasMaxLength(450);

        builder.HasIndex(e => e.Key).IsUnique();
    }
}

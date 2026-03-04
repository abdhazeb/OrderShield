using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class ReviewEvidenceFileConfiguration : IEntityTypeConfiguration<ReviewEvidenceFile>
{
    public void Configure(EntityTypeBuilder<ReviewEvidenceFile> builder)
    {
        builder.ToTable("ReviewEvidenceFiles");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.FileName)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(e => e.StoragePath)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(e => e.ContentType)
            .IsRequired()
            .HasMaxLength(100);
    }
}

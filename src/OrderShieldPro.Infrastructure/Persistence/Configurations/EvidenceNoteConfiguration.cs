using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class EvidenceNoteConfiguration : IEntityTypeConfiguration<EvidenceNote>
{
    public void Configure(EntityTypeBuilder<EvidenceNote> builder)
    {
        builder.ToTable("EvidenceNotes");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.AuthoredById)
            .IsRequired()
            .HasMaxLength(450);

        builder.Property(e => e.Summary)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(e => e.VerificationOutcome)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasIndex(e => e.ReviewId);
    }
}

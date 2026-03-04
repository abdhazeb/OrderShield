using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Infrastructure.Persistence.Configurations;

public class WatchRequestConfiguration : IEntityTypeConfiguration<WatchRequest>
{
    public void Configure(EntityTypeBuilder<WatchRequest> builder)
    {
        builder.ToTable("WatchRequests");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.RequestedById)
            .IsRequired()
            .HasMaxLength(450);

        builder.Property(e => e.EntityName)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(e => e.EntityPhone)
            .HasMaxLength(50);

        builder.Property(e => e.EntityWeChat)
            .HasMaxLength(100);

        builder.Property(e => e.EntityWebsite)
            .HasMaxLength(500);

        builder.Property(e => e.EntityCountry)
            .HasMaxLength(100);

        builder.Property(e => e.AdditionalDetails)
            .HasMaxLength(2000);

        builder.Property(e => e.EnquiryChecklist)
            .HasMaxLength(1000);

        builder.Property(e => e.AssignedToId)
            .HasMaxLength(450);

        builder.Property(e => e.ServiceTeamNotes)
            .HasMaxLength(4000);

        builder.Property(e => e.ReplyMessage)
            .HasMaxLength(4000);

        builder.Property(e => e.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasIndex(e => e.RequestedById);
        builder.HasIndex(e => e.Status);
    }
}

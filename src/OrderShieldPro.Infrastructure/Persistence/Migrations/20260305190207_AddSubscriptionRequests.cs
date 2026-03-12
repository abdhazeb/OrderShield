using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderShieldPro.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SubscriptionRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    RequestedTier = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DurationYears = table.Column<int>(type: "int", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentProofFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    PaymentProofStoragePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PaymentNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AdminNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReviewedById = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionRequests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionRequests_Status",
                table: "SubscriptionRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionRequests_UserId",
                table: "SubscriptionRequests",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SubscriptionRequests");
        }
    }
}

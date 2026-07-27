using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderShieldPro.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddApprovedAtToApplicationUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            // Backfill: every account that is already active was, by definition, already
            // approved. Without this they would all read as ApprovedAt == null, and the
            // first admin to freeze one would drop it into the pending-registration queue
            // where "reject" deletes the account outright. CreatedAt is the closest
            // approximation of the approval moment we still have.
            migrationBuilder.Sql(
                "UPDATE [AspNetUsers] SET [ApprovedAt] = [CreatedAt] WHERE [IsActive] = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "AspNetUsers");
        }
    }
}

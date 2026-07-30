using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderShieldPro.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContactPositionToReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactPosition",
                table: "Reviews",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactPosition",
                table: "Reviews");
        }
    }
}

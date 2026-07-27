using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderShieldPro.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIsHiddenToTradeEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NOTE: the scaffolder also proposed dropping Reviews.PendingEditJson, because
            // Review.PendingEditJson is [NotMapped] while an earlier hand-written migration
            // added the column. That drift is deliberately left alone here — dropping the
            // column is out of scope for this change and would have to be a decision of its
            // own. See CLAUDE.md.

            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "TradeEntities",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_TradeEntities_IsHidden",
                table: "TradeEntities",
                column: "IsHidden");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TradeEntities_IsHidden",
                table: "TradeEntities");

            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "TradeEntities");
        }
    }
}

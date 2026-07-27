using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Infrastructure.Identity;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Tests.Integration;

/// <summary>
/// Admin → Users. The rules that matter here are the ones that stop an admin from doing
/// irreversible damage: deletion is refused for anyone with reviews on record, and freezing
/// an approved account must not push it back into the pending-registration queue where
/// "reject" would delete it.
/// </summary>
public class AdminUsersControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public AdminUsersControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetUsers_WithoutAuthentication_IsRefused()
    {
        var response = await _client.GetAsync("/api/admin/users");

        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetUsers_AsSuperAdmin_ReturnsEveryRoleNotJustAdmins()
    {
        await AuthenticateAsSuperAdminAsync();
        var brokerEmail = await SeedUserAsync(UserRole.Broker);

        var response = await _client.GetAsync("/api/admin/users?pageSize=100");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        var items = JsonDocument.Parse(body).RootElement.GetProperty("items");
        items.EnumerateArray()
            .Select(u => u.GetProperty("email").GetString())
            .Should().Contain(brokerEmail);
    }

    [Fact]
    public async Task DeleteUser_WithReviewsOnRecord_IsRefusedAndExplainsWhy()
    {
        await AuthenticateAsSuperAdminAsync();
        var (userId, _) = await SeedUserWithReviewAsync();

        var response = await _client.DeleteAsync($"/api/admin/users/{userId}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        // The caller is told to freeze instead — a generic failure would leave the admin
        // with no idea what to do next.
        body.Should().Contain("Freeze");

        (await UserExistsAsync(userId)).Should().BeTrue();
    }

    [Fact]
    public async Task DeleteUser_WithNothingOnRecord_Succeeds()
    {
        await AuthenticateAsSuperAdminAsync();
        var email = await SeedUserAsync(UserRole.Buyer);
        var userId = await UserIdForAsync(email);

        var response = await _client.DeleteAsync($"/api/admin/users/{userId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await UserExistsAsync(userId)).Should().BeFalse();
    }

    [Fact]
    public async Task ToggleActive_FreezingAnApprovedUser_KeepsThemOutOfThePendingQueue()
    {
        await AuthenticateAsSuperAdminAsync();
        var email = await SeedUserAsync(UserRole.Buyer);
        var userId = await UserIdForAsync(email);

        var freeze = await _client.PutAsJsonAsync($"/api/admin/users/{userId}/toggle-active", new { });
        freeze.StatusCode.Should().Be(HttpStatusCode.OK);

        // Frozen, but still approved — the two states are recorded separately.
        var user = await LoadUserAsync(userId);
        user.IsActive.Should().BeFalse();
        user.ApprovedAt.Should().NotBeNull();

        var pending = await _client.GetAsync("/api/admin/users/pending");
        var pendingBody = await pending.Content.ReadAsStringAsync();
        pendingBody.Should().NotContain(email);
    }

    [Fact]
    public async Task RejectUser_OnAnAlreadyApprovedAccount_IsRefused()
    {
        await AuthenticateAsSuperAdminAsync();
        var email = await SeedUserAsync(UserRole.Buyer);
        var userId = await UserIdForAsync(email);

        // Freeze first, so the account is inactive but has been approved before.
        await _client.PutAsJsonAsync($"/api/admin/users/{userId}/toggle-active", new { });

        var response = await _client.PutAsJsonAsync($"/api/admin/users/{userId}/reject", new { });

        // Rejection deletes the account; it must never reach an account with history.
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await UserExistsAsync(userId)).Should().BeTrue();
    }

    [Fact]
    public async Task GetNavCounts_ReturnsEveryBadgeInOneCall()
    {
        await AuthenticateAsSuperAdminAsync();

        var response = await _client.GetAsync("/api/admin/nav-counts");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var root = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        foreach (var field in new[]
                 {
                     "pendingReviews", "hiddenReviews", "totalEntities", "hiddenEntities",
                     "pendingSubscriptions", "unreadMessages", "totalUsers", "pendingActions", "pendingUsers"
                 })
        {
            root.TryGetProperty(field, out _).Should().BeTrue($"nav-counts should include {field}");
        }
    }

    // ===== Helpers =====

    private async Task AuthenticateAsSuperAdminAsync()
    {
        var email = $"superadmin_{Guid.NewGuid():N}@example.com";
        const string password = "Test@12345";

        using (var scope = _factory.Services.CreateScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            if (!await roleManager.RoleExistsAsync("SuperAdmin"))
                await roleManager.CreateAsync(new IdentityRole("SuperAdmin"));

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                FullName = "Test Super Admin",
                Role = UserRole.SuperAdmin,
                IsActive = true,
                ApprovedAt = DateTime.UtcNow,
            };
            await userManager.CreateAsync(user, password);
            await userManager.AddToRoleAsync(user, "SuperAdmin");
        }

        var login = await _client.PostAsJsonAsync("/api/auth/login", new { Email = email, Password = password });
        var doc = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        var token = doc.RootElement.TryGetProperty("token", out var t)
            ? t.GetString()
            : doc.RootElement.GetProperty("accessToken").GetString();

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private async Task<string> SeedUserAsync(UserRole role)
    {
        var email = $"managed_{Guid.NewGuid():N}@example.com";

        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        await userManager.CreateAsync(new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FullName = "Managed User",
            Role = role,
            IsActive = true,
            ApprovedAt = DateTime.UtcNow,
        }, "Test@12345");

        return email;
    }

    private async Task<(string UserId, Guid EntityId)> SeedUserWithReviewAsync()
    {
        var email = await SeedUserAsync(UserRole.Broker);
        var userId = await UserIdForAsync(email);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var entity = new TradeEntity
        {
            LegalName = $"Reviewed Entity {Guid.NewGuid():N}",
            EntityType = EntityType.Supplier,
            Country = "China",
            ListedDate = DateTime.UtcNow,
        };
        db.TradeEntities.Add(entity);

        db.Reviews.Add(new Review
        {
            TradeEntityId = entity.Id,
            ReviewerId = userId,
            Title = "Undelivered order",
            Narrative = "Goods were never shipped.",
            Severity = SeverityLevel.Critical,
            Status = ReviewStatus.Published,
            ReviewerType = ReviewerType.Broker,
        });

        await db.SaveChangesAsync();
        return (userId, entity.Id);
    }

    private async Task<string> UserIdForAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByEmailAsync(email);
        return user!.Id;
    }

    private async Task<ApplicationUser> LoadUserAsync(string userId)
    {
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        return (await userManager.Users.AsNoTracking().FirstAsync(u => u.Id == userId))!;
    }

    private async Task<bool> UserExistsAsync(string userId)
    {
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        return await userManager.Users.AnyAsync(u => u.Id == userId);
    }
}

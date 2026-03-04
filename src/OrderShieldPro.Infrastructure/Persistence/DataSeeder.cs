using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Infrastructure.Identity;

namespace OrderShieldPro.Infrastructure.Persistence;

/// <summary>
/// Seeds the database with realistic demo data on first startup.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ApplicationDbContext>>();

        try
        {
            // Use Migrate for relational databases, EnsureCreated for InMemory
            if (context.Database.IsRelational())
            {
                await context.Database.MigrateAsync();
            }
            else
            {
                await context.Database.EnsureCreatedAsync();
            }

            await SeedRolesAsync(roleManager);
            var users = await SeedUsersAsync(userManager);
            if (!await context.SubscriptionPlans.AnyAsync())
            {
                await SeedSubscriptionPlansAsync(context);
            }

            if (!await context.TradeEntities.AnyAsync())
            {
                var entities = await SeedEntitiesAsync(context);
                await SeedReviewsAsync(context, entities, users);
                await SeedTestBuyerReviewsAsync(context, entities, users);
                await SeedEvidenceNotesAsync(context, users);
                await SeedWatchRequestsAsync(context, users);
                await SeedNotificationsAsync(context, entities, users);
            }

            // Seed system settings (always ensure defaults exist)
            if (!await context.SystemSettings.AnyAsync())
            {
                await SeedSystemSettingsAsync(context);
            }

            logger.LogInformation("Database seeding completed successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    private static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
    {
        string[] roles = ["Buyer", "Broker", "ServiceTeam", "Admin", "SuperAdmin"];
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }
    }

    private static async Task<Dictionary<string, ApplicationUser>> SeedUsersAsync(UserManager<ApplicationUser> userManager)
    {
        var users = new Dictionary<string, ApplicationUser>();

        // Admin user
        var admin = await EnsureUserAsync(userManager, new ApplicationUser
        {
            UserName = "admin@ordershieldpro.com",
            Email = "admin@ordershieldpro.com",
            EmailConfirmed = true,
            FullName = "System Administrator",
            Role = UserRole.Admin,
            SubscriptionTier = SubscriptionTier.Enterprise,
            TrustScore = 100,
            LanguagePreference = Language.En
        }, "Admin@123!", "Admin");
        users["admin"] = admin;

        // Gatwani Admin user (SuperAdmin)
        var gatwaniAdmin = await EnsureUserAsync(userManager, new ApplicationUser
        {
            UserName = "gatwaniadmin",
            Email = "gatwaniadmin@ordershieldpro.com",
            EmailConfirmed = true,
            FullName = "Gatwani Admin",
            Role = UserRole.SuperAdmin,
            SubscriptionTier = SubscriptionTier.Enterprise,
            TrustScore = 100,
            LanguagePreference = Language.En
        }, "Admin_123!!", "SuperAdmin");
        users["gatwaniAdmin"] = gatwaniAdmin;

        // Service Team user
        var serviceTeam = await EnsureUserAsync(userManager, new ApplicationUser
        {
            UserName = "sarah.chen@ordershieldpro.com",
            Email = "sarah.chen@ordershieldpro.com",
            EmailConfirmed = true,
            FullName = "Sarah Chen",
            Role = UserRole.ServiceTeam,
            SubscriptionTier = SubscriptionTier.Enterprise,
            TrustScore = 95,
            LanguagePreference = Language.Zh
        }, "Service@123!", "ServiceTeam");
        users["serviceTeam"] = serviceTeam;

        // Broker demo user
        var broker = await EnsureUserAsync(userManager, new ApplicationUser
        {
            UserName = "john.broker@example.com",
            Email = "john.broker@example.com",
            EmailConfirmed = true,
            FullName = "John Mitchell",
            Role = UserRole.Broker,
            Region = "Hong Kong",
            SubscriptionTier = SubscriptionTier.Pro,
            TrustScore = 78,
            LanguagePreference = Language.En
        }, "Broker@123!", "Broker");
        users["broker"] = broker;

        // Buyer demo user
        var buyer = await EnsureUserAsync(userManager, new ApplicationUser
        {
            UserName = "alice.buyer@example.com",
            Email = "alice.buyer@example.com",
            EmailConfirmed = true,
            FullName = "Alice Wang",
            Role = UserRole.Buyer,
            Region = "Shenzhen",
            SubscriptionTier = SubscriptionTier.Free,
            TrustScore = 65,
            LanguagePreference = Language.Zh
        }, "Buyer@123!", "Buyer");
        users["buyer"] = buyer;

        // Test Buyer for realistic testing (10 pending reviews)
        var testBuyer = await EnsureUserAsync(userManager, new ApplicationUser
        {
            UserName = "testbuyer@example.com",
            Email = "testbuyer@example.com",
            EmailConfirmed = true,
            FullName = "Omar Hassan",
            Role = UserRole.Buyer,
            Region = "Dubai",
            Organization = "Gulf Trade Partners LLC",
            SubscriptionTier = SubscriptionTier.Pro,
            TrustScore = 50,
            LanguagePreference = Language.Ar
        }, "Test@Buyer1!", "Buyer");
        users["testBuyer"] = testBuyer;

        return users;
    }

    private static async Task<ApplicationUser> EnsureUserAsync(
        UserManager<ApplicationUser> userManager,
        ApplicationUser user,
        string password,
        string role)
    {
        var existing = await userManager.FindByEmailAsync(user.Email!);
        if (existing != null)
            return existing;

        var result = await userManager.CreateAsync(user, password);
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(user, role);
        }
        return user;
    }

    private static async Task SeedSubscriptionPlansAsync(ApplicationDbContext context)
    {
        var plans = new List<SubscriptionPlan>
        {
            new()
            {
                Name = "Free",
                Tier = SubscriptionTier.Free,
                MonthlyPrice = 0,
                Description = "Basic access to entity search and review reading",
                MaxReviewsPerMonth = 2,
                MaxWatchlistSize = 5,
                HasPriorityVerification = false,
                HasAdvancedFilters = false,
                HasApiAccess = false,
                HasDedicatedSupport = false,
                FeaturesJson = "[\"Search entities\",\"Read reviews\",\"2 reviews/month\",\"5 watchlist items\"]",
                SortOrder = 1
            },
            new()
            {
                Name = "Pro",
                Tier = SubscriptionTier.Pro,
                MonthlyPrice = 29.99m,
                Description = "Professional plan for active traders",
                MaxReviewsPerMonth = 20,
                MaxWatchlistSize = 50,
                HasPriorityVerification = true,
                HasAdvancedFilters = true,
                HasApiAccess = false,
                HasDedicatedSupport = false,
                FeaturesJson = "[\"All Free features\",\"20 reviews/month\",\"50 watchlist items\",\"Priority verification\",\"Advanced filters\",\"Email notifications\"]",
                SortOrder = 2
            },
            new()
            {
                Name = "Enterprise",
                Tier = SubscriptionTier.Enterprise,
                MonthlyPrice = 99.99m,
                Description = "Full access for enterprises and organizations",
                MaxReviewsPerMonth = -1,
                MaxWatchlistSize = -1,
                HasPriorityVerification = true,
                HasAdvancedFilters = true,
                HasApiAccess = true,
                HasDedicatedSupport = true,
                FeaturesJson = "[\"All Pro features\",\"Unlimited reviews\",\"Unlimited watchlist\",\"API access\",\"Dedicated support\",\"Custom reports\"]",
                SortOrder = 3
            }
        };

        context.SubscriptionPlans.AddRange(plans);
        await context.SaveChangesAsync();
    }

    private static async Task<List<TradeEntity>> SeedEntitiesAsync(ApplicationDbContext context)
    {
        var entities = new List<TradeEntity>
        {
            new()
            {
                LegalName = "Shenzhen Aluminum Manufacturing Co., Ltd.",
                TradeName = "SZ Aluminum",
                EntityType = EntityType.Supplier,
                Country = "China",
                Region = "Guangdong",
                City = "Shenzhen",
                ProductCategories = "Metals,Aluminum,Raw Materials",
                VerificationStatus = VerificationStatus.Verified,
                VerificationScore = 72,
                TotalReviewCount = 8,
                InfoReviewCount = 3,
                WarningReviewCount = 3,
                CriticalReviewCount = 2,
                LastReviewDate = DateTime.UtcNow.AddDays(-5),
                ListedDate = DateTime.UtcNow.AddMonths(-14),
                PhoneNumbers = new List<EntityPhoneNumber>
                {
                    new() { PhoneNumber = "+86-755-8888-1234", IsPrimary = true },
                    new() { PhoneNumber = "+86-755-8888-5678", IsPrimary = false }
                },
                WeChatIds = new List<EntityWeChatId>
                {
                    new() { WeChatId = "sz_aluminum_official", IsPrimary = true }
                },
                HistoricalNames = new List<EntityHistoricalName>
                {
                    new() { PreviousName = "Shenzhen Metal Works Factory", ChangedDate = DateTime.UtcNow.AddYears(-2) }
                }
            },
            new()
            {
                LegalName = "Global Trade Bridge Ltd.",
                TradeName = "GTB Trading",
                EntityType = EntityType.Broker,
                Country = "Hong Kong",
                Region = "Hong Kong",
                City = "Central",
                ProductCategories = "General Trading,Import/Export",
                VerificationStatus = VerificationStatus.Verified,
                VerificationScore = 85,
                TotalReviewCount = 5,
                InfoReviewCount = 4,
                WarningReviewCount = 1,
                CriticalReviewCount = 0,
                LastReviewDate = DateTime.UtcNow.AddDays(-12),
                ListedDate = DateTime.UtcNow.AddMonths(-8),
                PhoneNumbers = new List<EntityPhoneNumber>
                {
                    new() { PhoneNumber = "+852-2345-6789", IsPrimary = true }
                },
                WeChatIds = new List<EntityWeChatId>
                {
                    new() { WeChatId = "gtb_trading_hk", IsPrimary = true }
                }
            },
            new()
            {
                LegalName = "Ningbo Electronics Factory",
                TradeName = "NB Electronics",
                EntityType = EntityType.Supplier,
                Country = "China",
                Region = "Zhejiang",
                City = "Ningbo",
                ProductCategories = "Electronics,Components,PCB",
                VerificationStatus = VerificationStatus.Unverified,
                VerificationScore = 45,
                TotalReviewCount = 4,
                InfoReviewCount = 1,
                WarningReviewCount = 1,
                CriticalReviewCount = 2,
                LastReviewDate = DateTime.UtcNow.AddDays(-3),
                ListedDate = DateTime.UtcNow.AddMonths(-6),
                PhoneNumbers = new List<EntityPhoneNumber>
                {
                    new() { PhoneNumber = "+86-574-5555-0001", IsPrimary = true }
                },
                WeChatIds = new List<EntityWeChatId>
                {
                    new() { WeChatId = "nb_electronics", IsPrimary = true }
                },
                HistoricalNames = new List<EntityHistoricalName>
                {
                    new() { PreviousName = "Ningbo Circuit Board Co.", ChangedDate = DateTime.UtcNow.AddMonths(-18) },
                    new() { PreviousName = "NB Digital Manufacturing", ChangedDate = DateTime.UtcNow.AddMonths(-10) }
                }
            },
            new()
            {
                LegalName = "Guangzhou Textile International Co., Ltd.",
                TradeName = "GZ Textiles",
                EntityType = EntityType.Supplier,
                Country = "China",
                Region = "Guangdong",
                City = "Guangzhou",
                ProductCategories = "Textiles,Fabrics,Garments",
                VerificationStatus = VerificationStatus.Clarified,
                VerificationScore = 60,
                TotalReviewCount = 3,
                InfoReviewCount = 1,
                WarningReviewCount = 2,
                CriticalReviewCount = 0,
                LastReviewDate = DateTime.UtcNow.AddDays(-20),
                ListedDate = DateTime.UtcNow.AddMonths(-10),
                PhoneNumbers = new List<EntityPhoneNumber>
                {
                    new() { PhoneNumber = "+86-20-3333-4444", IsPrimary = true }
                },
                WeChatIds = new List<EntityWeChatId>
                {
                    new() { WeChatId = "gz_textile_intl", IsPrimary = true }
                }
            },
            new()
            {
                LegalName = "Pacific Rim Logistics Pte. Ltd.",
                TradeName = "PRL Logistics",
                EntityType = EntityType.Broker,
                Country = "Singapore",
                Region = "Singapore",
                City = "Singapore",
                ProductCategories = "Logistics,Freight,Supply Chain",
                VerificationStatus = VerificationStatus.Verified,
                VerificationScore = 90,
                TotalReviewCount = 2,
                InfoReviewCount = 2,
                WarningReviewCount = 0,
                CriticalReviewCount = 0,
                LastReviewDate = DateTime.UtcNow.AddDays(-30),
                ListedDate = DateTime.UtcNow.AddMonths(-4),
                PhoneNumbers = new List<EntityPhoneNumber>
                {
                    new() { PhoneNumber = "+65-6789-0123", IsPrimary = true }
                }
            }
        };

        context.TradeEntities.AddRange(entities);
        await context.SaveChangesAsync();
        return entities;
    }

    private static async Task SeedReviewsAsync(
        ApplicationDbContext context,
        List<TradeEntity> entities,
        Dictionary<string, ApplicationUser> users)
    {
        var broker = users["broker"];
        var buyer = users["buyer"];

        var reviews = new List<Review>
        {
            // Shenzhen Aluminum — 8 reviews
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = broker.Id,
                ReviewerType = ReviewerType.Broker,
                TransactionRole = "Broker reviewing Supplier",
                Severity = SeverityLevel.Critical,
                Status = ReviewStatus.Published,
                Title = "Severe quality issues with aluminum sheets",
                Narrative = "Ordered 500 tons of aluminum sheets for a major construction project. Upon delivery, over 30% of the sheets had visible surface defects including scratches, dents, and inconsistent thickness. The supplier initially denied responsibility and delayed resolution for 3 weeks. Eventually agreed to a partial replacement but the project timeline was severely impacted. I would caution any buyer to request quality inspection before shipment.",
                Product = "Aluminum Sheets 6061-T6",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddMonths(-2),
                OrderValue = 125000m,
                ContactPhoneUsed = "+86-755-8888-1234",
                ContactWeChatUsed = "sz_aluminum_official",
                VerificationEmail = "john.broker@example.com",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-2)
            },
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Published,
                Title = "Delayed shipment and poor communication",
                Narrative = "Placed an order for aluminum extrusions. The agreed delivery date was missed by 2 weeks with minimal communication from the supplier side. When I followed up, responses were slow and vague. The product quality was acceptable when it finally arrived, but the delay caused us to miss our own production deadline. Communication needs significant improvement and I recommend getting written delivery guarantees.",
                Product = "Aluminum Extrusions",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddMonths(-3),
                OrderValue = 45000m,
                ContactPhoneUsed = "+86-755-8888-5678",
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-3)
            },
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = broker.Id,
                ReviewerType = ReviewerType.Broker,
                TransactionRole = "Broker reviewing Supplier",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Published,
                Title = "Reliable for small orders",
                Narrative = "Have used this supplier for several small orders of aluminum rods and bars. Quality has been consistent and pricing competitive. They tend to be more responsive and reliable with smaller order quantities. For orders under 50 tons, I have had a positive experience. Delivery was on time and packaging was adequate. Would recommend for smaller scale procurement needs where the risk exposure is lower.",
                Product = "Aluminum Rods",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddMonths(-5),
                OrderValue = 18000m,
                ContactPhoneUsed = "+86-755-8888-1234",
                VerificationEmail = "john.broker@example.com",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-5)
            },
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Published,
                Title = "Pricing changed after contract signed",
                Narrative = "After signing a purchase agreement for 200 tons of aluminum ingots, the supplier attempted to renegotiate the price citing raw material cost increases. This was done after our deposit was already paid. We eventually negotiated a smaller increase but it was a frustrating experience. The final product was delivered as specified but the business practices were concerning and unprofessional. Always ensure you have strong contract protections.",
                Product = "Aluminum Ingots",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddMonths(-4),
                OrderValue = 89000m,
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-4)
            },
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = broker.Id,
                ReviewerType = ReviewerType.Broker,
                TransactionRole = "Broker reviewing Supplier",
                Severity = SeverityLevel.Critical,
                Status = ReviewStatus.Published,
                Title = "Counterfeit certifications provided",
                Narrative = "During due diligence for a large order, we discovered that the quality certifications provided by this supplier were not genuine. The ISO 9001 certificate had been modified and the testing lab reports could not be verified with the issuing laboratories. This is a serious concern that calls into question the integrity of the supplier's operations. We immediately cancelled the order and filed a formal complaint. All buyers should independently verify any certifications.",
                Product = "Aluminum Alloy Plates",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddDays(-15),
                OrderValue = 250000m,
                ContactPhoneUsed = "+86-755-8888-1234",
                VerificationEmail = "john.broker@example.com",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-15)
            },
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Published,
                Title = "Good experience with sample orders",
                Narrative = "Ordered sample quantities of various aluminum products for testing purposes. The samples were delivered promptly and the quality was as described in their catalog. Communication during the sample ordering process was professional and responsive. The sales team provided detailed technical specifications and was knowledgeable about their product range. Good option for initial evaluation and sample procurement.",
                Product = "Aluminum Samples",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddMonths(-6),
                OrderValue = 2500m,
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-6)
            },
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = broker.Id,
                ReviewerType = ReviewerType.Broker,
                TransactionRole = "Broker reviewing Supplier",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Pending,
                Title = "Factory visit showed decent operations",
                Narrative = "Conducted a factory visit as part of supplier evaluation. The manufacturing facility appeared well-maintained with modern equipment. The production capacity claimed appears to be accurate based on the machinery observed. However, quality control processes seemed informal with limited documentation. Workers appeared experienced but safety standards could be improved. Overall, the factory visit was a mixed experience — capable production but gaps in QC documentation.",
                Product = "Factory Evaluation",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddDays(-8),
                VerificationEmail = "john.broker@example.com",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-8)
            },
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Pending,
                Title = "Inconsistent product specifications",
                Narrative = "Received a batch of aluminum profiles that did not match the agreed specifications. The alloy composition tested differently from what was stated on the material certificate. While the deviation was small and did not affect our immediate use case, it raises concerns about quality consistency and reliability of their documentation. I have raised this with the supplier and they are investigating. Will update once resolved but flagging for awareness.",
                Product = "Aluminum Profiles",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddDays(-5),
                OrderValue = 35000m,
                ContactWeChatUsed = "sz_aluminum_official",
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            },

            // Global Trade Bridge — 5 reviews
            new()
            {
                TradeEntityId = entities[1].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Buyer via Broker",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Published,
                Title = "Professional brokerage service",
                Narrative = "Used Global Trade Bridge as an intermediary for sourcing electronics components from mainland China. Their team was professional, responsive, and knowledgeable about the market. They provided comprehensive supplier evaluations and helped negotiate favorable terms. Their fee structure was transparent and reasonable. The sourcing process was smooth and they maintained good communication throughout. Would highly recommend for international trade facilitation.",
                Product = "Electronics Components",
                ProductCategory = "General Trading",
                IncidentDate = DateTime.UtcNow.AddMonths(-1),
                OrderValue = 75000m,
                ContactPhoneUsed = "+852-2345-6789",
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-1)
            },
            new()
            {
                TradeEntityId = entities[1].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Buyer via Broker",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Published,
                Title = "Excellent quality control support",
                Narrative = "GTB Trading arranged factory audits and quality inspections on our behalf. Their QC team was thorough and professional. They identified potential issues before shipment that could have caused problems. Their inspection reports were detailed with photographic evidence. This level of quality assurance gave us confidence in our purchasing decisions. The additional cost for QC services was well worth the investment and peace of mind.",
                Product = "Quality Control Services",
                ProductCategory = "General Trading",
                IncidentDate = DateTime.UtcNow.AddMonths(-2),
                OrderValue = 5000m,
                ContactWeChatUsed = "gtb_trading_hk",
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-2)
            },
            new()
            {
                TradeEntityId = entities[1].Id,
                ReviewerId = broker.Id,
                ReviewerType = ReviewerType.Broker,
                TransactionRole = "Broker-to-Broker collaboration",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Published,
                Title = "Reliable partner for cross-border deals",
                Narrative = "Collaborated with GTB on several cross-border transactions between Hong Kong and Southeast Asian markets. Their knowledge of regulatory requirements and customs procedures is extensive. They handled all documentation efficiently which expedited the clearance process. Their network of contacts in the region is valuable and they facilitated introductions to reliable shipping partners. A dependable partner for regional trade.",
                Product = "Cross-border Trade Services",
                ProductCategory = "General Trading",
                IncidentDate = DateTime.UtcNow.AddMonths(-3),
                VerificationEmail = "john.broker@example.com",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-3)
            },
            new()
            {
                TradeEntityId = entities[1].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Buyer via Broker",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Published,
                Title = "Slow response during Chinese New Year",
                Narrative = "During the Chinese New Year holiday period, communication with GTB became very difficult. Our urgent order modifications were not addressed for over a week, which caused logistical complications. While I understand holiday considerations, as an international trading company handling time-sensitive transactions, better contingency planning is expected. Outside of the holiday period, their service is generally responsive and professional.",
                Product = "Textile Products",
                ProductCategory = "General Trading",
                IncidentDate = DateTime.UtcNow.AddMonths(-4),
                OrderValue = 32000m,
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-4)
            },
            new()
            {
                TradeEntityId = entities[1].Id,
                ReviewerId = broker.Id,
                ReviewerType = ReviewerType.Broker,
                TransactionRole = "Broker reviewing Broker",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Published,
                Title = "Transparent business practices",
                Narrative = "In my experience working alongside GTB Trading, they maintain fair and transparent business practices. Commission structures are clearly communicated upfront and there are no hidden fees. They provide detailed breakdowns of all costs involved in each transaction. Their contracts are straightforward and legally sound. This transparency builds trust and makes repeat business easier. A model for how brokerage firms should operate in international trade.",
                VerificationEmail = "john.broker@example.com",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-12)
            },

            // Ningbo Electronics — 4 reviews
            new()
            {
                TradeEntityId = entities[2].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Critical,
                Status = ReviewStatus.Published,
                Title = "Received counterfeit electronic components",
                Narrative = "Ordered 10,000 units of capacitors and upon testing, approximately 15% failed basic quality tests. Further investigation revealed that some components appeared to be counterfeit or recycled parts sold as new. This is extremely dangerous for electronic applications where component reliability is critical. We had to scrap the entire batch for safety reasons resulting in significant financial loss. Filed a complaint but received no satisfactory response.",
                Product = "Capacitors MLCCs",
                ProductCategory = "Electronics",
                IncidentDate = DateTime.UtcNow.AddMonths(-1),
                OrderValue = 28000m,
                ContactPhoneUsed = "+86-574-5555-0001",
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-1)
            },
            new()
            {
                TradeEntityId = entities[2].Id,
                ReviewerId = broker.Id,
                ReviewerType = ReviewerType.Broker,
                TransactionRole = "Broker reviewing Supplier",
                Severity = SeverityLevel.Critical,
                Status = ReviewStatus.Published,
                Title = "Multiple order cancellations without notice",
                Narrative = "This supplier has cancelled orders on three separate occasions without prior notice, each time citing production capacity issues only after payments were received. Getting refunds was a prolonged process taking 4-6 weeks each time. The unpredictability of their order fulfillment makes them an unreliable supply chain partner. Their previous company name change (from Ningbo Circuit Board Co.) also raises concerns about accountability and track record continuity.",
                Product = "PCB Assemblies",
                ProductCategory = "Electronics",
                IncidentDate = DateTime.UtcNow.AddDays(-20),
                OrderValue = 55000m,
                ContactWeChatUsed = "nb_electronics",
                VerificationEmail = "john.broker@example.com",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-20)
            },
            new()
            {
                TradeEntityId = entities[2].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Published,
                Title = "Competitive pricing on standard components",
                Narrative = "For standard, commodity electronic components like resistors and basic connectors, this supplier offers very competitive pricing. Small sample orders have been fulfilled accurately and on time. However, I would exercise caution with larger orders or specialty components based on other reports I have seen. Their standard catalog items seem to be legitimate and reasonably priced. Suitable for non-critical applications where independent testing is feasible.",
                Product = "Resistors and Connectors",
                ProductCategory = "Electronics",
                IncidentDate = DateTime.UtcNow.AddMonths(-3),
                OrderValue = 8000m,
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-3)
            },
            new()
            {
                TradeEntityId = entities[2].Id,
                ReviewerId = broker.Id,
                ReviewerType = ReviewerType.Broker,
                TransactionRole = "Broker reviewing Supplier",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Pending,
                Title = "Questionable RoHS compliance documentation",
                Narrative = "When requesting RoHS compliance certificates for a European client order, the documentation provided appeared inconsistent. The certificate numbers could not be independently verified with the listed testing agencies. While this does not definitively prove non-compliance, the inability to verify certification raises red flags, especially for components destined for regulated markets. I strongly recommend independent third-party testing before accepting shipments.",
                Product = "Electronic Components",
                ProductCategory = "Electronics",
                IncidentDate = DateTime.UtcNow.AddDays(-3),
                OrderValue = 42000m,
                VerificationEmail = "john.broker@example.com",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            },

            // Guangzhou Textile — 3 reviews
            new()
            {
                TradeEntityId = entities[3].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Published,
                Title = "Color inconsistency across fabric batches",
                Narrative = "Ordered 5000 meters of cotton fabric in a specific Pantone color. The delivered fabric showed noticeable color variation between different rolls. While each individual roll was consistent, the color difference between production batches was visible and unacceptable for our garment manufacturing needs. The supplier did offer a partial discount but the cost of sorting and managing mixed fabrics added unexpected labor time.",
                Product = "Cotton Fabric",
                ProductCategory = "Textiles",
                IncidentDate = DateTime.UtcNow.AddMonths(-1),
                OrderValue = 22000m,
                ContactPhoneUsed = "+86-20-3333-4444",
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-1)
            },
            new()
            {
                TradeEntityId = entities[3].Id,
                ReviewerId = broker.Id,
                ReviewerType = ReviewerType.Broker,
                TransactionRole = "Broker reviewing Supplier",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Published,
                Title = "Good variety and reasonable MOQ",
                Narrative = "This textile supplier offers an extensive range of fabric types with minimum order quantities that are manageable for medium-sized buyers. Their catalog includes cotton, polyester, blended fabrics, and specialty textiles. Sample availability is good and turnaround is typically 3-5 business days. Pricing is competitive within the Guangzhou market. Recommended for buyers looking for variety and flexibility in fabric sourcing with moderate order sizes.",
                Product = "Various Textiles",
                ProductCategory = "Textiles",
                IncidentDate = DateTime.UtcNow.AddMonths(-2),
                VerificationEmail = "john.broker@example.com",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-2)
            },
            new()
            {
                TradeEntityId = entities[3].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Published,
                Title = "Shipping packaging needs improvement",
                Narrative = "The fabric rolls arrived with inadequate packaging resulting in water damage to approximately 10% of the shipment. The outer wrapping was basic plastic sheeting without proper moisture barriers. For international shipments that may be exposed to varying conditions during transit, better packaging standards are necessary. The supplier acknowledged the issue and provided credit for damaged goods but this should have been prevented with proper packaging protocols.",
                Product = "Polyester Fabric",
                ProductCategory = "Textiles",
                IncidentDate = DateTime.UtcNow.AddDays(-20),
                OrderValue = 15000m,
                ContactWeChatUsed = "gz_textile_intl",
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-20)
            },

            // Pacific Rim Logistics — 2 reviews
            new()
            {
                TradeEntityId = entities[4].Id,
                ReviewerId = buyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Buyer using logistics services",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Published,
                Title = "Excellent freight management service",
                Narrative = "PRL Logistics managed our container shipments from China to Southeast Asia with impressive efficiency. Their tracking system provides real-time updates and their customer service team is always accessible. They proactively communicated about potential delays and offered alternative routing when port congestion occurred. Their pricing model is competitive and transparent with no unexpected surcharges. A logistics partner we trust for critical shipments.",
                Product = "Freight Services",
                ProductCategory = "Logistics",
                IncidentDate = DateTime.UtcNow.AddMonths(-1),
                OrderValue = 12000m,
                ContactPhoneUsed = "+65-6789-0123",
                VerificationEmail = "alice.buyer@example.com",
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddMonths(-1)
            },
            new()
            {
                TradeEntityId = entities[4].Id,
                ReviewerId = broker.Id,
                ReviewerType = ReviewerType.Broker,
                TransactionRole = "Broker reviewing logistics provider",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Published,
                Title = "Reliable customs clearance support",
                Narrative = "Pacific Rim Logistics has been instrumental in handling customs documentation and clearance for our cross-border transactions. Their team has in-depth knowledge of customs regulations across the ASEAN region and they consistently achieve smooth clearance without delays. They also provide valuable advice on duty optimization and trade agreement utilization. Their expertise has saved our clients significant time and money on import duties.",
                Product = "Customs Clearance Services",
                ProductCategory = "Logistics",
                IncidentDate = DateTime.UtcNow.AddDays(-30),
                VerificationEmail = "john.broker@example.com",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-30)
            }
        };

        // Set UpdatedAt on published reviews to simulate realistic moderation turnaround times
        var rng = new Random(42);
        foreach (var r in reviews)
        {
            if (r.Status == ReviewStatus.Published)
            {
                r.UpdatedAt = r.CreatedAt.AddHours(rng.Next(4, 72));
            }
        }

        context.Reviews.AddRange(reviews);
        await context.SaveChangesAsync();
    }

    private static async Task SeedEvidenceNotesAsync(
        ApplicationDbContext context,
        Dictionary<string, ApplicationUser> users)
    {
        var serviceTeam = users["serviceTeam"];

        // Get the first two critical reviews for evidence notes
        var criticalReviews = await context.Reviews
            .Where(r => r.Severity == SeverityLevel.Critical && r.Status == ReviewStatus.Published)
            .OrderBy(r => r.CreatedAt)
            .Take(2)
            .ToListAsync();

        if (criticalReviews.Count < 2) return;

        var evidenceNotes = new List<EvidenceNote>
        {
            new()
            {
                ReviewId = criticalReviews[0].Id,
                AuthoredById = serviceTeam.Id,
                Summary = "Service team has contacted the supplier regarding the quality issues reported. The supplier acknowledges a batch quality issue during that production period and has implemented additional quality checkpoints. Documentation of the new QC procedures has been requested and is pending review. The supplier's response is being evaluated for adequacy.",
                VerificationOutcome = VerificationStatus.Clarified,
                IsPubliclyVisible = true,
                CreatedBy = serviceTeam.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            },
            new()
            {
                ReviewId = criticalReviews[1].Id,
                AuthoredById = serviceTeam.Id,
                Summary = "Investigation into the counterfeit certification claim is underway. Preliminary findings confirm that the ISO certificate number does not match records in the ISO registry for this company. The matter has been escalated to our compliance team for further action. The supplier has been notified and given 14 days to provide valid documentation.",
                VerificationOutcome = VerificationStatus.Insufficient,
                IsPubliclyVisible = true,
                CreatedBy = serviceTeam.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            }
        };

        context.EvidenceNotes.AddRange(evidenceNotes);
        await context.SaveChangesAsync();
    }

    private static async Task SeedWatchRequestsAsync(
        ApplicationDbContext context,
        Dictionary<string, ApplicationUser> users)
    {
        var broker = users["broker"];
        var buyer = users["buyer"];
        var serviceTeam = users["serviceTeam"];

        var watchRequests = new List<WatchRequest>
        {
            new()
            {
                RequestedById = broker.Id,
                EntityName = "Shanghai Steel Corporation",
                EntityPhone = "+86-21-6666-7777",
                EntityCountry = "China",
                AdditionalDetails = "A new steel supplier I encountered at the Canton Fair. They seem legitimate but I want to verify before proceeding with a large order.",
                Status = InvestigationStatus.InProgress,
                AssignedToId = serviceTeam.Id,
                ServiceTeamNotes = "Initial search shows company registration is valid. Conducting deeper background check.",
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-7)
            },
            new()
            {
                RequestedById = buyer.Id,
                EntityName = "Vietnam Plastics Manufacturing",
                EntityPhone = "+84-28-1234-5678",
                EntityWeChat = "vn_plastics",
                EntityCountry = "Vietnam",
                AdditionalDetails = "Looking for reviews on this plastics manufacturer. They offered very low prices which seem suspicious.",
                Status = InvestigationStatus.Completed,
                AssignedToId = serviceTeam.Id,
                ServiceTeamNotes = "Company verified through Vietnamese business registry. No negative reports found. Entity has been created in our database.",
                ResolvedDate = DateTime.UtcNow.AddDays(-2),
                CreatedBy = buyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-14)
            },
            new()
            {
                RequestedById = broker.Id,
                EntityName = "Dongguan Precision Parts Ltd.",
                EntityCountry = "China",
                AdditionalDetails = "Supplier recommended by a colleague. Want to check if there are any flags before doing business.",
                Status = InvestigationStatus.Pending,
                CreatedBy = broker.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            }
        };

        context.WatchRequests.AddRange(watchRequests);
        await context.SaveChangesAsync();
    }

    private static async Task SeedNotificationsAsync(
        ApplicationDbContext context,
        List<TradeEntity> entities,
        Dictionary<string, ApplicationUser> users)
    {
        var broker = users["broker"];
        var buyer = users["buyer"];

        var notifications = new List<Notification>
        {
            new()
            {
                UserId = broker.Id,
                Type = NotificationType.NewReviewOnFollowedEntity,
                Title = "New review posted",
                Message = $"A new review has been posted for {entities[0].LegalName}.",
                ReferenceEntityId = entities[0].Id,
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new()
            {
                UserId = broker.Id,
                Type = NotificationType.ReviewStatusChanged,
                Title = "Review published",
                Message = "Your review has been reviewed and published by the service team.",
                ReferenceEntityId = entities[0].Id,
                IsRead = true,
                ReadAt = DateTime.UtcNow.AddDays(-1),
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                UserId = buyer.Id,
                Type = NotificationType.WatchRequestResolved,
                Title = "Investigation complete",
                Message = "Your watch request for 'Vietnam Plastics Manufacturing' has been resolved. The entity has been added to our database.",
                ReferenceEntityId = entities.Count > 3 ? entities[3].Id : entities[0].Id,
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new()
            {
                UserId = buyer.Id,
                Type = NotificationType.NewReviewOnFollowedEntity,
                Title = "New critical review",
                Message = $"A critical review has been posted for {entities[2].LegalName}.",
                ReferenceEntityId = entities[2].Id,
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddHours(-5)
            },
            new()
            {
                UserId = broker.Id,
                Type = NotificationType.InvestigationComplete,
                Title = "Watch request update",
                Message = "Your investigation request for 'Shanghai Steel Corporation' is now in progress.",
                ReferenceEntityId = entities.Count > 4 ? entities[4].Id : entities[1].Id,
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            }
        };

        context.Notifications.AddRange(notifications);
        await context.SaveChangesAsync();

        // Add followed entities for demo users
        var followedEntities = new List<UserFollowedEntity>
        {
            new() { UserId = broker.Id, TradeEntityId = entities[0].Id, FollowedAt = DateTime.UtcNow.AddMonths(-2) },
            new() { UserId = broker.Id, TradeEntityId = entities[1].Id, FollowedAt = DateTime.UtcNow.AddMonths(-1) },
            new() { UserId = buyer.Id, TradeEntityId = entities[0].Id, FollowedAt = DateTime.UtcNow.AddMonths(-3) },
            new() { UserId = buyer.Id, TradeEntityId = entities[2].Id, FollowedAt = DateTime.UtcNow.AddMonths(-1) },
            new() { UserId = buyer.Id, TradeEntityId = entities[3].Id, FollowedAt = DateTime.UtcNow.AddDays(-15) }
        };

        context.UserFollowedEntities.AddRange(followedEntities);
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seeds 10 pending reviews from the test buyer across multiple entities
    /// so admins can approve/reject them for realistic testing.
    /// </summary>
    private static async Task SeedTestBuyerReviewsAsync(
        ApplicationDbContext context,
        List<TradeEntity> entities,
        Dictionary<string, ApplicationUser> users)
    {
        var testBuyer = users["testBuyer"];

        var testReviews = new List<Review>
        {
            // Review 1 — Critical, Shenzhen Aluminum
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = testBuyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Critical,
                Status = ReviewStatus.Pending,
                Title = "Not available",
                Narrative = "Placed a large order for aluminum coils worth $180,000. After full payment was made via wire transfer, the supplier became unresponsive for over three weeks. When they finally replied, they claimed production delays but could not provide any evidence of manufacturing progress. We suspect the funds may have been misappropriated. Our legal team is now involved and we are exploring formal dispute resolution channels. Extreme caution advised.",
                Product = "Aluminum Coils",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddDays(-10),
                OrderValue = 180000m,
                ContactPhoneUsed = "+86-755-8888-1234",
                ContactWeChatUsed = "sz_aluminum_official",
                VerificationEmail = "testbuyer@example.com",
                CreatedBy = testBuyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-4)
            },
            // Review 2 — Warning, Shenzhen Aluminum
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = testBuyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Pending,
                Title = "Mislabeled alloy grades on packaging",
                Narrative = "Received a shipment of aluminum bars labeled as 7075-T6 grade. However, independent lab testing showed the material was actually 6061-T6 which has significantly lower tensile strength. This mislabeling could have led to structural failures in our aerospace components if not caught during our incoming quality inspection. The supplier was confronted with the lab results and offered to replace the batch, but this incident has eroded our trust significantly.",
                Product = "Aluminum Bars 7075-T6",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddDays(-14),
                OrderValue = 67000m,
                ContactPhoneUsed = "+86-755-8888-5678",
                VerificationEmail = "testbuyer@example.com",
                CreatedBy = testBuyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            },
            // Review 3 — Info, Global Trade Bridge
            new()
            {
                TradeEntityId = entities[1].Id,
                ReviewerId = testBuyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Buyer via Broker",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Pending,
                Title = "Smooth sourcing experience for textiles",
                Narrative = "Engaged Global Trade Bridge to source cotton fabric from Guangdong province for our garment manufacturing operation in the UAE. The process was professionally managed from supplier selection through to final delivery. They provided three vetted supplier options with detailed comparison reports. Negotiated pricing was competitive and the quality inspection they arranged before shipment caught minor defects early. Total lead time was 6 weeks which met our expectations.",
                Product = "Cotton Fabric",
                ProductCategory = "Textiles",
                IncidentDate = DateTime.UtcNow.AddDays(-20),
                OrderValue = 42000m,
                ContactPhoneUsed = "+852-2345-6789",
                ContactWeChatUsed = "gtb_trading_hk",
                VerificationEmail = "testbuyer@example.com",
                CreatedBy = testBuyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            },
            // Review 4 — Warning, Global Trade Bridge
            new()
            {
                TradeEntityId = entities[1].Id,
                ReviewerId = testBuyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Buyer via Broker",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Pending,
                Title = "Commission fees not fully disclosed upfront",
                Narrative = "While the overall service was satisfactory, I discovered additional service charges on the final invoice that were not mentioned during our initial agreement discussions. These included a 'documentation processing fee' and a 'quality assurance surcharge' totaling an extra 3.5% on top of the agreed commission. When questioned, they claimed these were standard fees mentioned in the fine print of their terms. I recommend requesting a comprehensive fee breakdown in writing before engaging their services.",
                Product = "Sourcing Services",
                ProductCategory = "General Trading",
                IncidentDate = DateTime.UtcNow.AddDays(-25),
                OrderValue = 8500m,
                VerificationEmail = "testbuyer@example.com",
                CreatedBy = testBuyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-6)
            },
            // Review 5 — Critical, Ningbo Electronics
            new()
            {
                TradeEntityId = entities[2].Id,
                ReviewerId = testBuyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Critical,
                Status = ReviewStatus.Pending,
                Title = "Shipped used components labeled as new",
                Narrative = "Ordered 50,000 pieces of MOSFET transistors specified as new production. Upon receiving and inspecting the shipment, our engineering team discovered clear signs of component remarking — sanded tops, inconsistent date codes, and non-uniform markings. X-ray inspection revealed solder residue on leads indicating these were harvested from used circuit boards. This is unacceptable and dangerous, particularly for our automotive electronics applications where component reliability is mission-critical. We have filed a formal complaint and are pursuing a full refund.",
                Product = "MOSFET Transistors",
                ProductCategory = "Electronics",
                IncidentDate = DateTime.UtcNow.AddDays(-8),
                OrderValue = 95000m,
                ContactPhoneUsed = "+86-574-5555-0001",
                ContactWeChatUsed = "nb_electronics",
                VerificationEmail = "testbuyer@example.com",
                CreatedBy = testBuyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            // Review 6 — Warning, Ningbo Electronics
            new()
            {
                TradeEntityId = entities[2].Id,
                ReviewerId = testBuyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Pending,
                Title = "Lead times consistently longer than quoted",
                Narrative = "Over three separate orders in the past six months, this supplier has exceeded their quoted lead times by an average of 12 days. The first order was 8 days late, the second was 14 days late, and the most recent was 15 days late. Each time the reasons given were different — raw material shortages, equipment maintenance, and customs delays. While the product quality has been acceptable, the unreliable delivery schedule creates significant production planning challenges for our assembly line operations.",
                Product = "Capacitors and Resistors",
                ProductCategory = "Electronics",
                IncidentDate = DateTime.UtcNow.AddDays(-12),
                OrderValue = 31000m,
                VerificationEmail = "testbuyer@example.com",
                CreatedBy = testBuyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            },
            // Review 7 — Info, Guangzhou Textile
            new()
            {
                TradeEntityId = entities[3].Id,
                ReviewerId = testBuyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Pending,
                Title = "Great sample quality and fast response",
                Narrative = "Requested fabric samples for our new product line and received them within 4 business days, which is faster than most suppliers in the region. The sample quality was excellent — color accuracy was very close to the Pantone references we provided, and the fabric weight and hand feel were as specified. The sales representative was helpful and knowledgeable, providing detailed technical data sheets for each fabric type. We are planning to proceed with a bulk order based on these positive sample results.",
                Product = "Polyester-Cotton Blend Fabric",
                ProductCategory = "Textiles",
                IncidentDate = DateTime.UtcNow.AddDays(-18),
                OrderValue = 1200m,
                ContactPhoneUsed = "+86-20-3333-4444",
                ContactWeChatUsed = "gz_textile_intl",
                VerificationEmail = "testbuyer@example.com",
                CreatedBy = testBuyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-4)
            },
            // Review 8 — Warning, Guangzhou Textile
            new()
            {
                TradeEntityId = entities[3].Id,
                ReviewerId = testBuyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Warning,
                Status = ReviewStatus.Pending,
                Title = "Fabric shrinkage rate higher than specification",
                Narrative = "Purchased 3,000 meters of cotton jersey fabric with a stated maximum shrinkage rate of 3%. After pre-washing per standard procedures, the actual shrinkage measured between 5.5% and 7.2% across different rolls. This caused significant cutting waste and required us to re-grade our patterns, adding unexpected costs. The supplier's technical team acknowledged the issue was likely due to insufficient pre-shrinking treatment during finishing. They offered a 15% discount on the next order as compensation.",
                Product = "Cotton Jersey Fabric",
                ProductCategory = "Textiles",
                IncidentDate = DateTime.UtcNow.AddDays(-15),
                OrderValue = 19500m,
                VerificationEmail = "testbuyer@example.com",
                CreatedBy = testBuyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            },
            // Review 9 — Info, Pacific Rim Logistics
            new()
            {
                TradeEntityId = entities[4].Id,
                ReviewerId = testBuyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Buyer using logistics services",
                Severity = SeverityLevel.Info,
                Status = ReviewStatus.Pending,
                Title = "Handled emergency shipment professionally",
                Narrative = "Had an urgent situation where a container of goods needed to be rerouted from Singapore to Dubai due to a last-minute buyer change. PRL Logistics handled the rerouting within 24 hours, including all necessary documentation changes and customs adjustments. Their operations team worked overtime to ensure the shipment cleared Dubai customs without delays. The additional charges for the rerouting were reasonable and clearly communicated before we confirmed. This level of responsiveness sets them apart from other logistics providers we have used.",
                Product = "Freight Rerouting Services",
                ProductCategory = "Logistics",
                IncidentDate = DateTime.UtcNow.AddDays(-22),
                OrderValue = 4800m,
                ContactPhoneUsed = "+65-6789-0123",
                VerificationEmail = "testbuyer@example.com",
                CreatedBy = testBuyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-7)
            },
            // Review 10 — Critical, Shenzhen Aluminum
            new()
            {
                TradeEntityId = entities[0].Id,
                ReviewerId = testBuyer.Id,
                ReviewerType = ReviewerType.Buyer,
                TransactionRole = "Direct Buyer",
                Severity = SeverityLevel.Critical,
                Status = ReviewStatus.Pending,
                Title = "Hazardous material contamination detected",
                Narrative = "During routine incoming material testing for our food-grade packaging line, elevated levels of lead and cadmium were detected in the aluminum foil supplied by this company. The contamination levels exceeded both EU and FDA safety limits for food-contact materials. This is an extremely serious issue that could have resulted in a major product recall and consumer health risk if our quality lab had not caught it. We have immediately quarantined the entire shipment and reported the findings to the relevant regulatory authorities. All potential buyers should demand independent third-party material composition testing.",
                Product = "Aluminum Foil Food-Grade",
                ProductCategory = "Metals",
                IncidentDate = DateTime.UtcNow.AddDays(-6),
                OrderValue = 52000m,
                ContactPhoneUsed = "+86-755-8888-1234",
                VerificationEmail = "testbuyer@example.com",
                CreatedBy = testBuyer.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            }
        };

        context.Reviews.AddRange(testReviews);
        await context.SaveChangesAsync();
    }

    private static async Task SeedSystemSettingsAsync(ApplicationDbContext context)
    {
        var settings = new List<SystemSetting>
        {
            new()
            {
                Key = "enquiry_sla_days",
                Value = "2",
                Description = "Number of working days to respond to supplier enquiries"
            }
        };

        context.SystemSettings.AddRange(settings);
        await context.SaveChangesAsync();
    }
}

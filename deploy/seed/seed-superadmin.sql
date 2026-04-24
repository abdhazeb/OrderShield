-- =============================================================================
-- Seed: SuperAdmin user for OrderShieldPro (production)
--
-- Credentials:
--   Email/UserName : gatwaniadmin@ordershieldpro.com  (UserName: gatwaniadmin)
--   Password       : Admin_123!!
--
-- The PasswordHash below uses ASP.NET Core Identity V3 PBKDF2-HMACSHA256 format
-- (100,000 iterations, 128-bit salt, 256-bit subkey). It will validate normally
-- against the same password the application's DataSeeder would have created.
--
-- This script is idempotent: running it twice will not duplicate the user/role.
-- =============================================================================
SET NOCOUNT ON;
BEGIN TRANSACTION;

DECLARE @UserId        nvarchar(450) = LOWER(CONVERT(nvarchar(36), NEWID()));
DECLARE @Email         nvarchar(256) = N'gatwaniadmin@ordershieldpro.com';
DECLARE @UserName      nvarchar(256) = N'gatwaniadmin';
DECLARE @PasswordHash  nvarchar(max) = N'AQAAAAEAAYagAAAAEMreCYjYvZst2kJRSvN6kMgeSOdcuuf7thdtoHrovK5SHRMjimY9Ju2bWGCGZjtJGQ==';
DECLARE @Now           datetime2     = SYSUTCDATETIME();
DECLARE @RoleName      nvarchar(256) = N'SuperAdmin';
DECLARE @RoleId        nvarchar(450);

-- ---------------------------------------------------------------------------
-- 1. Ensure the SuperAdmin role exists in AspNetRoles.
-- ---------------------------------------------------------------------------
SELECT @RoleId = Id FROM dbo.AspNetRoles WHERE NormalizedName = UPPER(@RoleName);

IF @RoleId IS NULL
BEGIN
    SET @RoleId = LOWER(CONVERT(nvarchar(36), NEWID()));
    INSERT INTO dbo.AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
    VALUES (@RoleId, @RoleName, UPPER(@RoleName), CONVERT(nvarchar(36), NEWID()));
    PRINT 'Created role: SuperAdmin';
END
ELSE
BEGIN
    PRINT 'Role SuperAdmin already exists.';
END

-- ---------------------------------------------------------------------------
-- 2. Insert the SuperAdmin user (skip if it already exists by email).
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.AspNetUsers WHERE NormalizedEmail = UPPER(@Email))
BEGIN
    INSERT INTO dbo.AspNetUsers (
        Id, UserName, NormalizedUserName, Email, NormalizedEmail, EmailConfirmed,
        PasswordHash, SecurityStamp, ConcurrencyStamp,
        PhoneNumber, PhoneNumberConfirmed, TwoFactorEnabled,
        LockoutEnd, LockoutEnabled, AccessFailedCount,
        FullName, Role, Region, Organization, LanguagePreference,
        SubscriptionTier, SubscriptionExpiryDate, NotificationPreferencesJson,
        TrustScore, IsActive, CreatedAt, UpdatedAt,
        BusinessName, LicenseAddress, BusinessPhone, BusinessLicenseFilePath, IsBusinessVerified,
        RefreshToken, RefreshTokenExpiresAt
    )
    VALUES (
        @UserId, @UserName, UPPER(@UserName), @Email, UPPER(@Email), 1,
        @PasswordHash,
        CONVERT(nvarchar(36), NEWID()),  -- SecurityStamp
        CONVERT(nvarchar(36), NEWID()),  -- ConcurrencyStamp
        NULL, 0, 0,
        NULL, 1, 0,
        N'Gatwani Admin', N'SuperAdmin', NULL, NULL, N'En',
        N'Pro', NULL, NULL,
        100, 1, @Now, NULL,
        NULL, NULL, NULL, NULL, 0,
        NULL, NULL
    );
    PRINT 'Created user: gatwaniadmin@ordershieldpro.com';
END
ELSE
BEGIN
    SELECT @UserId = Id FROM dbo.AspNetUsers WHERE NormalizedEmail = UPPER(@Email);
    PRINT 'User already exists; reusing existing Id.';
END

-- ---------------------------------------------------------------------------
-- 3. Link the user to the SuperAdmin role.
-- ---------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM dbo.AspNetUserRoles
    WHERE UserId = @UserId AND RoleId = @RoleId
)
BEGIN
    INSERT INTO dbo.AspNetUserRoles (UserId, RoleId) VALUES (@UserId, @RoleId);
    PRINT 'Linked user to SuperAdmin role.';
END

COMMIT TRANSACTION;

-- ---------------------------------------------------------------------------
-- 4. Verification query.
-- ---------------------------------------------------------------------------
SELECT u.Email, u.UserName, u.FullName, u.Role, u.IsActive, r.Name AS RoleName
FROM dbo.AspNetUsers u
JOIN dbo.AspNetUserRoles ur ON ur.UserId = u.Id
JOIN dbo.AspNetRoles r      ON r.Id      = ur.RoleId
WHERE u.NormalizedEmail = UPPER(N'gatwaniadmin@ordershieldpro.com');

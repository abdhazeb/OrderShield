# Generates a SQL script that seeds TradeEntities (and child phone rows)
# from the ATV & UTV Parts.xls export (atv-utv-data.json).
#
# Ignored Excel fields: Contact Person, Mr/Ms, Address, Post Code, Introduction.
#
# Maps:
#   Company Name        -> LegalName (Title Cased)
#   Company Name (CN)   -> TradeName
#   Province            -> Region
#   City                -> City
#   Country             -> 'China' (constant; all rows are PRC)
#   Main Products       -> ProductCategories
#   Website             -> ExternalRegistryLinks (JSON array)
#   Mobile / Tel / Fax  -> EntityPhoneNumbers (one row per non-empty value)

param(
    [string]$JsonPath = (Join-Path $PSScriptRoot 'atv-utv-data.json'),
    [string]$OutPath  = (Join-Path $PSScriptRoot 'seed-atv-utv-trade-entities.sql')
)

function Esc([string]$s) {
    if ($null -eq $s) { return 'NULL' }
    $t = $s.Trim()
    if ([string]::IsNullOrEmpty($t)) { return 'NULL' }
    return "N'" + ($t -replace "'", "''") + "'"
}

function TitleCase([string]$s) {
    if ([string]::IsNullOrWhiteSpace($s)) { return $s }
    $ti = (Get-Culture).TextInfo
    return $ti.ToTitleCase($s.ToLower())
}

$data = Get-Content $JsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- Seed: TradeEntities from 'ATV & UTV Parts.xls' (China suppliers)")
[void]$sb.AppendLine("-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$sb.AppendLine("-- Rows: $($data.Count)")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("SET NOCOUNT ON;")
[void]$sb.AppendLine("BEGIN TRANSACTION;")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("DECLARE @Now datetime2 = SYSUTCDATETIME();")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("-- Staging table holds a deterministic Id per source row so child phone")
[void]$sb.AppendLine("-- numbers can reference the parent without an OUTPUT-into round trip.")
[void]$sb.AppendLine("DECLARE @Stage TABLE (")
[void]$sb.AppendLine("    Id uniqueidentifier NOT NULL,")
[void]$sb.AppendLine("    LegalName nvarchar(500) NOT NULL,")
[void]$sb.AppendLine("    TradeName nvarchar(500) NULL,")
[void]$sb.AppendLine("    Region nvarchar(200) NULL,")
[void]$sb.AppendLine("    City nvarchar(200) NULL,")
[void]$sb.AppendLine("    ProductCategories nvarchar(1000) NULL,")
[void]$sb.AppendLine("    ExternalRegistryLinks nvarchar(4000) NULL,")
[void]$sb.AppendLine("    Mobile nvarchar(50) NULL,")
[void]$sb.AppendLine("    Tel nvarchar(50) NULL,")
[void]$sb.AppendLine("    Fax nvarchar(50) NULL")
[void]$sb.AppendLine(");")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("INSERT INTO @Stage (Id, LegalName, TradeName, Region, City, ProductCategories, ExternalRegistryLinks, Mobile, Tel, Fax) VALUES")

$lines = @()
foreach ($row in $data) {
    $legal = TitleCase $row.CompanyName
    $trade = if ([string]::IsNullOrWhiteSpace($row.CompanyNameCN)) { $null } else { $row.CompanyNameCN.Trim() }
    $region = if ([string]::IsNullOrWhiteSpace($row.Province)) { $null } else { (TitleCase $row.Province) }
    $city = if ([string]::IsNullOrWhiteSpace($row.City)) { $null } else { (TitleCase $row.City) }

    $products = $null
    if (-not [string]::IsNullOrWhiteSpace($row.MainProducts)) {
        $p = $row.MainProducts.Trim()
        if ($p.Length -gt 1000) { $p = $p.Substring(0, 1000) }
        $products = $p
    }

    $website = $null
    if (-not [string]::IsNullOrWhiteSpace($row.Website)) {
        $w = $row.Website.Trim()
        # JSON-encode a single-element array of the URL
        $website = '[' + (ConvertTo-Json $w -Compress) + ']'
        if ($website.Length -gt 4000) { $website = $null }
    }

    $mobile = if ([string]::IsNullOrWhiteSpace($row.Mobile)) { $null } else { $row.Mobile.Trim() }
    $tel    = if ([string]::IsNullOrWhiteSpace($row.Tel))    { $null } else { $row.Tel.Trim() }
    $fax    = if ([string]::IsNullOrWhiteSpace($row.Fax))    { $null } else { $row.Fax.Trim() }

    if ($mobile -and $mobile.Length -gt 50) { $mobile = $mobile.Substring(0, 50) }
    if ($tel    -and $tel.Length    -gt 50) { $tel    = $tel.Substring(0, 50) }
    if ($fax    -and $fax.Length    -gt 50) { $fax    = $fax.Substring(0, 50) }

    $lines += "    (NEWID(), $(Esc $legal), $(Esc $trade), $(Esc $region), $(Esc $city), $(Esc $products), $(Esc $website), $(Esc $mobile), $(Esc $tel), $(Esc $fax))"
}
[void]$sb.AppendLine(($lines -join ",`r`n") + ";")
[void]$sb.AppendLine("")

# Insert into TradeEntities
[void]$sb.AppendLine("-- Insert parent TradeEntities (skip duplicates by LegalName)")
[void]$sb.AppendLine("INSERT INTO dbo.TradeEntities (")
[void]$sb.AppendLine("    Id, LegalName, TradeName, EntityType, Country, Region, City,")
[void]$sb.AppendLine("    ProductCategories, VerificationStatus, VerificationScore, ExternalRegistryLinks,")
[void]$sb.AppendLine("    TotalReviewCount, InfoReviewCount, WarningReviewCount, CriticalReviewCount,")
[void]$sb.AppendLine("    LastReviewDate, ListedDate, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy")
[void]$sb.AppendLine(")")
[void]$sb.AppendLine("SELECT")
[void]$sb.AppendLine("    s.Id, s.LegalName, s.TradeName, N'Supplier', N'China', s.Region, s.City,")
[void]$sb.AppendLine("    s.ProductCategories, N'Unverified', 0, s.ExternalRegistryLinks,")
[void]$sb.AppendLine("    0, 0, 0, 0, NULL, @Now, @Now, NULL, NULL, NULL")
[void]$sb.AppendLine("FROM @Stage s")
[void]$sb.AppendLine("WHERE NOT EXISTS (SELECT 1 FROM dbo.TradeEntities te WHERE te.LegalName = s.LegalName);")
[void]$sb.AppendLine("")

# Insert phone numbers
[void]$sb.AppendLine("-- Insert phone numbers (one row per non-empty Mobile/Tel/Fax). Mobile is primary.")
[void]$sb.AppendLine("INSERT INTO dbo.EntityPhoneNumbers (Id, TradeEntityId, PhoneNumber, IsPrimary, CreatedAt, UpdatedAt)")
[void]$sb.AppendLine("SELECT NEWID(), s.Id, s.Mobile, 1, @Now, NULL FROM @Stage s WHERE s.Mobile IS NOT NULL")
[void]$sb.AppendLine("UNION ALL")
[void]$sb.AppendLine("SELECT NEWID(), s.Id, s.Tel,    0, @Now, NULL FROM @Stage s WHERE s.Tel    IS NOT NULL")
[void]$sb.AppendLine("UNION ALL")
[void]$sb.AppendLine("SELECT NEWID(), s.Id, s.Fax,    0, @Now, NULL FROM @Stage s WHERE s.Fax    IS NOT NULL;")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("DECLARE @Inserted int = (SELECT COUNT(*) FROM @Stage);")
[void]$sb.AppendLine("PRINT CONCAT('Inserted ', @Inserted, ' staged rows.');")
[void]$sb.AppendLine("COMMIT TRANSACTION;")

$sb.ToString() | Out-File -FilePath $OutPath -Encoding UTF8
Write-Host "Wrote $OutPath"


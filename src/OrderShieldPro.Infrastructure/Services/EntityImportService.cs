using System.Globalization;
using NPOI.SS.UserModel;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Infrastructure.Services;

/// <summary>
/// Parses the two known bulk-entity spreadsheet formats using NPOI, which reads both the
/// legacy OLE2 .xls container (Cantoon template) and OOXML .xlsx (Qicha/Qichacha template)
/// through the same API — <see cref="WorkbookFactory"/> detects which one it's looking at
/// from the file's own magic bytes, not the extension.
///
/// Both source datasets are Chinese supplier/manufacturer directories, so Country is a
/// fixed "China" for everything this service produces — there is no country column in
/// either template to read instead.
/// </summary>
public class EntityImportService : IEntityImportService
{
    private const int MaxDataRows = 50_000;

    public Result<IReadOnlyList<ParsedEntityRow>> Parse(Stream fileStream, string fileName)
    {
        IWorkbook workbook;
        try
        {
            workbook = WorkbookFactory.Create(fileStream);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<ParsedEntityRow>>.Failure(
                $"Could not read '{fileName}' as an Excel file: {ex.Message}");
        }

        using (workbook)
        {
            var sheet = workbook.GetSheetAt(0);
            if (sheet is null || sheet.LastRowNum < 0)
                return Result<IReadOnlyList<ParsedEntityRow>>.Failure("The spreadsheet has no data.");

            var firstRow = sheet.GetRow(sheet.FirstRowNum);
            var firstCellText = GetCellString(firstRow?.GetCell(0));

            if (firstCellText.Contains("企查查") || firstCellText.TrimStart().StartsWith("声明"))
            {
                return ParseQicha(sheet, fileName);
            }

            var looksLikeCantoon = firstRow is not null && RowCells(firstRow)
                .Any(cell => Normalize(GetCellString(cell)) == "company name");

            if (looksLikeCantoon)
                return ParseCantoon(sheet, fileName);

            return Result<IReadOnlyList<ParsedEntityRow>>.Failure(
                $"'{fileName}' doesn't match either supported template (Cantoon or Qicha). " +
                "Its first row didn't contain a recognizable header.");
        }
    }

    // ===== Cantoon: English headers on the first row, data from the second. =====
    private static Result<IReadOnlyList<ParsedEntityRow>> ParseCantoon(ISheet sheet, string fileName)
    {
        var headerRow = sheet.GetRow(sheet.FirstRowNum);
        var columns = MapHeaders(headerRow, new (string Key, Func<string, bool> Match)[]
        {
            ("legalName", h => h == "company name"),
            ("tradeName", h => h.Contains("company name") && h.Contains("cn")),
            ("region", h => h == "province"),
            ("city", h => h == "city"),
            ("mobile", h => h.Contains("mobile")),
            ("tel", h => h == "tel"),
            ("fax", h => h == "fax"),
            ("website", h => h == "website"),
            ("products", h => h.Contains("main products")),
        });

        if (!columns.ContainsKey("legalName"))
            return Result<IReadOnlyList<ParsedEntityRow>>.Failure(
                $"'{fileName}' looks like a Cantoon-style export but its \"Company Name\" column couldn't be located.");

        var rows = new List<ParsedEntityRow>();
        var lastRow = Math.Min(sheet.LastRowNum, sheet.FirstRowNum + MaxDataRows);

        for (var i = sheet.FirstRowNum + 1; i <= lastRow; i++)
        {
            var row = sheet.GetRow(i);
            if (row is null) continue;

            var legalNameRaw = Cell(row, columns, "legalName");
            if (string.IsNullOrWhiteSpace(legalNameRaw) && IsRowBlank(row)) continue;

            var phones = new List<string>();
            AddPhones(phones, Cell(row, columns, "mobile"));
            AddPhones(phones, Cell(row, columns, "tel"));
            AddPhones(phones, Cell(row, columns, "fax"));

            var products = Cell(row, columns, "products");
            if (products.Length > 1000) products = products[..1000];

            rows.Add(new ParsedEntityRow
            {
                LegalName = TitleCase(legalNameRaw),
                TradeName = NullIfEmpty(Cell(row, columns, "tradeName")),
                Country = "China",
                Region = NullIfEmpty(TitleCase(Cell(row, columns, "region"))),
                City = NullIfEmpty(TitleCase(Cell(row, columns, "city"))),
                ProductCategories = NullIfEmpty(products),
                Website = NullIfEmpty(Cell(row, columns, "website")),
                PhoneNumbers = phones
            });
        }

        return Result<IReadOnlyList<ParsedEntityRow>>.Success(rows);
    }

    // ===== Qicha (企查查): a disclaimer banner on row 1, real headers on row 2, data from
    // row 3. Missing values are the literal string "-", not blank cells. =====
    private static Result<IReadOnlyList<ParsedEntityRow>> ParseQicha(ISheet sheet, string fileName)
    {
        var headerRowIndex = sheet.FirstRowNum + 1;
        var headerRow = sheet.GetRow(headerRowIndex);
        var columns = MapHeaders(headerRow, new (string Key, Func<string, bool> Match)[]
        {
            ("legalName", h => h == "企业名称"),
            ("tradeName", h => h == "英文名"),
            ("region", h => h == "所属省份"),
            ("city", h => h == "所属城市"),
            ("website", h => h == "官网网址"),
            ("mobile", h => h == "有效手机号"),
            ("morePhone", h => h == "更多电话"),
            ("industryTop", h => h == "国标行业门类"),
            ("industryMajor", h => h == "国标行业大类"),
            ("industryMedium", h => h == "国标行业中类"),
            ("industryMinor", h => h == "国标行业小类"),
        });

        if (!columns.ContainsKey("legalName"))
            return Result<IReadOnlyList<ParsedEntityRow>>.Failure(
                $"'{fileName}' looks like a Qicha export but its \"企业名称\" column couldn't be located.");

        var rows = new List<ParsedEntityRow>();
        var dataStart = headerRowIndex + 1;
        var lastRow = Math.Min(sheet.LastRowNum, dataStart + MaxDataRows);

        for (var i = dataStart; i <= lastRow; i++)
        {
            var row = sheet.GetRow(i);
            if (row is null) continue;

            var legalName = QichaValue(Cell(row, columns, "legalName"));
            if (legalName is null) continue;

            var phones = new List<string>();
            AddPhones(phones, QichaValue(Cell(row, columns, "mobile")));
            AddPhones(phones, QichaValue(Cell(row, columns, "morePhone")));

            var industry = new[]
            {
                QichaValue(Cell(row, columns, "industryTop")),
                QichaValue(Cell(row, columns, "industryMajor")),
                QichaValue(Cell(row, columns, "industryMedium")),
                QichaValue(Cell(row, columns, "industryMinor")),
            }.Where(v => v is not null).Distinct().ToList();
            var products = industry.Count > 0 ? string.Join(" / ", industry) : null;
            if (products is { Length: > 1000 }) products = products[..1000];

            var tradeName = QichaValue(Cell(row, columns, "tradeName"));

            rows.Add(new ParsedEntityRow
            {
                LegalName = legalName,
                TradeName = tradeName != legalName ? tradeName : null,
                Country = "China",
                Region = QichaValue(Cell(row, columns, "region")),
                City = QichaValue(Cell(row, columns, "city")),
                ProductCategories = products,
                Website = QichaValue(Cell(row, columns, "website")),
                PhoneNumbers = phones
            });
        }

        return Result<IReadOnlyList<ParsedEntityRow>>.Success(rows);
    }

    /// <summary>Qicha represents "no value" as the literal text "-", not a blank cell.</summary>
    private static string? QichaValue(string raw)
    {
        var trimmed = raw.Trim();
        return trimmed is "" or "-" ? null : trimmed;
    }

    private static Dictionary<string, int> MapHeaders(IRow? headerRow, (string Key, Func<string, bool> Match)[] fields)
    {
        var map = new Dictionary<string, int>();
        if (headerRow is null) return map;

        foreach (var cell in RowCells(headerRow))
        {
            var normalized = Normalize(GetCellString(cell));
            foreach (var (key, match) in fields)
            {
                if (!map.ContainsKey(key) && match(normalized))
                {
                    map[key] = cell.ColumnIndex;
                }
            }
        }
        return map;
    }

    private static string Cell(IRow row, Dictionary<string, int> columns, string key) =>
        columns.TryGetValue(key, out var index) ? GetCellString(row.GetCell(index)) : string.Empty;

    /// <summary>
    /// Separators that appear between numbers packed into a single cell. Both templates do
    /// this — Qicha's 更多电话 is semicolon-delimited, and Cantoon's Mobile/Tel cells are
    /// hand-entered, so they turn up comma-, slash-, newline- and 、-separated too. A cell
    /// that holds three numbers has to become three searchable rows, since the phone number
    /// is how a broker looks an entity up.
    /// </summary>
    private static readonly char[] PhoneSeparators = { ';', '；', ',', '，', '、', '/', '\\', '|', '\n', '\r' };

    private static void AddPhones(List<string> target, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return;

        foreach (var part in value.Split(PhoneSeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var phone = part.Trim();
            // Qicha writes a missing value as "-", and a split can leave a fragment that is
            // punctuation only ("()", "转"), which is not a number anyone can search for.
            if (phone.Length == 0 || phone == "-" || !phone.Any(char.IsDigit)) continue;
            if (!target.Contains(phone, StringComparer.OrdinalIgnoreCase))
                target.Add(phone);
        }
    }

    private static bool IsRowBlank(IRow row) => RowCells(row).All(c => string.IsNullOrWhiteSpace(GetCellString(c)));

    private static IEnumerable<ICell> RowCells(IRow row)
    {
        for (var i = row.FirstCellNum; i < row.LastCellNum; i++)
        {
            if (i < 0) continue;
            var cell = row.GetCell(i);
            if (cell is not null) yield return cell;
        }
    }

    private static string Normalize(string s) =>
        s.ToLowerInvariant().Replace('（', '(').Replace('）', ')').Trim();

    private static string? NullIfEmpty(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static string TitleCase(string s)
    {
        if (string.IsNullOrWhiteSpace(s)) return s;
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(s.Trim().ToLowerInvariant());
    }

    private static string GetCellString(ICell? cell)
    {
        if (cell is null) return string.Empty;
        switch (cell.CellType)
        {
            case CellType.String:
                return cell.StringCellValue?.Trim() ?? string.Empty;
            case CellType.Numeric:
                return DateUtil.IsCellDateFormatted(cell)
                    ? cell.DateCellValue?.ToString("yyyy-MM-dd") ?? string.Empty
                    : cell.NumericCellValue.ToString(CultureInfo.InvariantCulture);
            case CellType.Boolean:
                return cell.BooleanCellValue.ToString();
            case CellType.Formula:
                try { return cell.StringCellValue?.Trim() ?? string.Empty; }
                catch { return cell.ToString()?.Trim() ?? string.Empty; }
            default:
                return string.Empty;
        }
    }
}

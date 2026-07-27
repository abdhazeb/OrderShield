using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Common.Interfaces;

/// <summary>
/// A single trade entity extracted from an uploaded spreadsheet, normalized to exactly
/// the fields TradeEntity actually stores. Every other column in either source template
/// (legal representative, established date, headcount, email, business profile text,
/// etc.) has no home on TradeEntity and is deliberately dropped during parsing.
/// </summary>
public record ParsedEntityRow
{
    public string LegalName { get; init; } = string.Empty;
    public string? TradeName { get; init; }
    public string Country { get; init; } = string.Empty;
    public string? Region { get; init; }
    public string? City { get; init; }
    public string? ProductCategories { get; init; }
    public string? Website { get; init; }
    public List<string> PhoneNumbers { get; init; } = new();
}

/// <summary>
/// Parses a bulk entity-import spreadsheet. Supports two known export formats and
/// auto-detects which one a given file is from its header row(s):
///   - "Cantoon": English headers on row 1, starting with "Company Name" (a Canton-Fair
///     -style supplier directory export — the same layout as ATV &amp; UTV Parts.xls).
///   - "Qicha" (企查查/Qichacha): a disclaimer banner on row 1, Chinese headers on row 2,
///     starting with "企业名称".
/// </summary>
public interface IEntityImportService
{
    Result<IReadOnlyList<ParsedEntityRow>> Parse(Stream fileStream, string fileName);
}

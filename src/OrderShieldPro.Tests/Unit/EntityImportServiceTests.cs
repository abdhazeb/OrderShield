using FluentAssertions;
using OrderShieldPro.Infrastructure.Services;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// Runs the real Cantoon and Qicha template files (copied into TestData/) through the
/// parser. These are the actual admin-supplied templates, not synthetic fixtures — if
/// either export tool changes its column layout, these are the tests that will catch it.
/// </summary>
public class EntityImportServiceTests
{
    private readonly EntityImportService _service = new();

    private static Stream OpenTestFile(string name) =>
        File.OpenRead(Path.Combine(AppContext.BaseDirectory, "TestData", name));

    [Fact]
    public void Parse_CantoonTemplate_ExtractsExpectedFields()
    {
        using var stream = OpenTestFile("cantoon-template.xls");

        var result = _service.Parse(stream, "cantoon-template.xls");

        result.Succeeded.Should().BeTrue(because: string.Join("; ", result.Errors));
        result.Data.Should().ContainSingle();

        var row = result.Data![0];
        row.LegalName.Should().Be("Guangzhou Sanmak Lighting Co., Ltd.");
        row.TradeName.Should().Be("广州市三锦照明电器有限公司");
        row.Country.Should().Be("China");
        row.Region.Should().Be("Guangdong");
        row.City.Should().Be("Guangzhou");
        row.Website.Should().Be("http://www.sanmak.com");
        row.ProductCategories.Should().Contain("led work light");
        row.PhoneNumbers.Should().Contain("134 1614 7542"); // Mobile
        row.PhoneNumbers.Should().Contain("002085170909");   // Tel
        row.PhoneNumbers.Should().Contain("002085173571");   // Fax
    }

    [Fact]
    public void Parse_QichaTemplate_SkipsDisclaimerRowAndDashPlaceholders()
    {
        using var stream = OpenTestFile("qicha-template.xlsx");

        var result = _service.Parse(stream, "qicha-template.xlsx");

        result.Succeeded.Should().BeTrue(because: string.Join("; ", result.Errors));
        result.Data.Should().NotBeEmpty();

        var first = result.Data!.First(r => r.LegalName == "杭州芯镍电池制造有限公司");
        first.Region.Should().Be("浙江省");
        first.City.Should().Be("杭州市");
        first.Country.Should().Be("China");
        // The template represents "no value" as a literal "-"; every one of these fields
        // is "-" for this row and must come through as null, not the string "-".
        first.Website.Should().BeNull();

        var withPhones = result.Data!.First(r => r.LegalName == "宁夏绿聚能源股份有限公司");
        withPhones.PhoneNumbers.Should().Contain("13469621906");
        withPhones.PhoneNumbers.Should().Contain("0952-5816112");
        withPhones.PhoneNumbers.Should().NotContain("-");
    }

    [Fact]
    public void Parse_QichaTemplate_BuildsProductCategoriesFromIndustryClassification()
    {
        using var stream = OpenTestFile("qicha-template.xlsx");

        var result = _service.Parse(stream, "qicha-template.xlsx");

        var row = result.Data!.First(r => r.LegalName == "杭州芯镍电池制造有限公司");
        row.ProductCategories.Should().Contain("制造业").And.Contain("电气机械和器材制造业");
    }

    [Fact]
    public void Parse_UnrecognizedFile_FailsWithAClearMessage()
    {
        using var stream = new MemoryStream("not an excel file"u8.ToArray());

        var result = _service.Parse(stream, "notes.txt");

        result.Succeeded.Should().BeFalse();
        result.Errors.Should().ContainSingle();
    }
}

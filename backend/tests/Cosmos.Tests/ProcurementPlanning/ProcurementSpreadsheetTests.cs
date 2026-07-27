using System.IO.Compression;
using System.Text;
using Cosmos.Application.Services;

namespace Cosmos.Tests.ProcurementPlanning;

public sealed class ProcurementSpreadsheetTests
{
    [Fact]
    public void ImportParser_ParsesFutureConfigurableChannelFromCsv()
    {
        var csv = "SalesDate,ChannelCode,ChannelSku,ChannelProductName,Quantity\r\n2026-06-30,NEW,SKU-1,Product,2.5\r\n"u8.ToArray();
        var row = Assert.Single(ProcurementSalesImportParser.Parse("sales.csv", csv));
        Assert.Equal("NEW", row.ChannelCode);
        Assert.Equal(2.5m, row.Quantity);
        Assert.Empty(row.Errors);
    }

    [Fact]
    public void ImportParser_ReturnsRowErrorsForInvalidQuantity()
    {
        var csv = "SalesDate,ChannelCode,ChannelSku,Quantity\n2026-06-30,AMZ,SKU-1,0\n"u8.ToArray();
        var row = Assert.Single(ProcurementSalesImportParser.Parse("sales.csv", csv));
        Assert.Contains(row.Errors, x => x.Contains("greater than zero", StringComparison.Ordinal));
    }

    [Fact]
    public void ImportTemplate_IsAValidXlsxAndRoundTripsThroughParser()
    {
        var content = ProcurementXlsxWriter.CreateImportTemplate();
        using var archive = new ZipArchive(new MemoryStream(content), ZipArchiveMode.Read);
        Assert.NotNull(archive.GetEntry("xl/workbook.xml"));
        var row = Assert.Single(ProcurementSalesImportParser.Parse("template.xlsx", content));
        Assert.Equal("AMZ", row.ChannelCode);
        Assert.Empty(row.Errors);
    }

    [Fact]
    public void ImportParser_RejectsFormulaCellsInXlsxRows()
    {
        using var stream = new MemoryStream(ProcurementXlsxWriter.CreateImportTemplate());
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Update, leaveOpen: true))
        {
            var entry = archive.GetEntry("xl/worksheets/sheet1.xml")!;
            string xml;
            using (var reader = new StreamReader(entry.Open(), Encoding.UTF8)) xml = reader.ReadToEnd();
            entry.Delete();
            var replacement = archive.CreateEntry("xl/worksheets/sheet1.xml");
            using var writer = new StreamWriter(replacement.Open(), new UTF8Encoding(false));
            writer.Write(xml.Replace("<c r=\"E2\" s=\"2\"><v>1</v></c>", "<c r=\"E2\" s=\"2\"><f>1+1</f><v>1</v></c>", StringComparison.Ordinal));
        }

        var row = Assert.Single(ProcurementSalesImportParser.Parse("formula.xlsx", stream.ToArray()));
        Assert.Contains("Formula cells are not allowed", Assert.Single(row.Errors), StringComparison.Ordinal);
    }

    [Fact]
    public void ImportParser_RejectsForgedXlsxSignature()
    {
        Assert.Throws<InvalidDataException>(() => ProcurementSalesImportParser.Parse("forged.xlsx", "not a zip file"u8.ToArray()));
    }
}

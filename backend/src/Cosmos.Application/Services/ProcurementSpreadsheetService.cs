using System.Globalization;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using Cosmos.Application.ProcurementPlanning;
using Cosmos.Contracts.ProcurementPlanning;

namespace Cosmos.Application.Services;

public static class ProcurementSalesImportParser
{
    private const int MaximumRows = 50_000;
    private const int MaximumArchiveEntries = 200;
    private const long MaximumEntryBytes = 20L * 1024 * 1024;
    private const long MaximumExpandedBytes = 50L * 1024 * 1024;

    public static string ComputeHash(byte[] content) => Convert.ToHexString(SHA256.HashData(content));

    public static IReadOnlyCollection<ParsedSalesImportRow> Parse(string fileName, byte[] content)
    {
        var extension = Path.GetExtension(fileName);
        return extension.ToLowerInvariant() switch
        {
            ".csv" => ParseCsv(content),
            ".xlsx" => ParseXlsx(content),
            _ => throw new InvalidDataException("Only .csv and .xlsx sales files are supported.")
        };
    }

    private static IReadOnlyCollection<ParsedSalesImportRow> ParseCsv(byte[] content)
    {
        var text = new UTF8Encoding(false, true).GetString(content);
        var records = ReadCsvRecords(text);
        return ParseRecords(records);
    }

    private static IReadOnlyCollection<ParsedSalesImportRow> ParseXlsx(byte[] content)
    {
        using var stream = new MemoryStream(content, writable: false);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: false);
        ValidateArchive(archive);
        var sharedStrings = ReadSharedStrings(archive);
        var sheetPath = GetFirstWorksheetPath(archive);
        var sheetEntry = archive.GetEntry(sheetPath) ?? throw new InvalidDataException("The workbook's first worksheet is missing.");
        var records = new List<IReadOnlyList<string?>>();
        var formulaRows = new HashSet<int>();

        using var sheetStream = sheetEntry.Open();
        var document = XDocument.Load(sheetStream, LoadOptions.None);
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        foreach (var row in document.Descendants(ns + "row"))
        {
            if (records.Count >= MaximumRows + 1) throw new InvalidDataException($"Sales imports cannot exceed {MaximumRows:N0} data rows.");
            var rowNumber = (int?)row.Attribute("r") ?? records.Count + 1;
            var values = new Dictionary<int, string?>();
            foreach (var cell in row.Elements(ns + "c"))
            {
                var reference = (string?)cell.Attribute("r") ?? string.Empty;
                var column = GetColumnIndex(reference);
                var type = (string?)cell.Attribute("t");
                if (cell.Element(ns + "f") is not null) formulaRows.Add(rowNumber);
                string? value;
                if (string.Equals(type, "inlineStr", StringComparison.Ordinal))
                {
                    value = string.Concat(cell.Descendants(ns + "t").Select(x => x.Value));
                }
                else
                {
                    value = cell.Element(ns + "v")?.Value;
                    if (string.Equals(type, "s", StringComparison.Ordinal) && int.TryParse(value, out var sharedIndex) && sharedIndex >= 0 && sharedIndex < sharedStrings.Count)
                    {
                        value = sharedStrings[sharedIndex];
                    }
                }

                values[column] = value;
            }

            if (values.Count == 0) continue;
            var width = values.Keys.Max() + 1;
            var record = new string?[width];
            foreach (var cell in values) record[cell.Key] = cell.Value;
            while (records.Count < rowNumber - 1) records.Add(Array.Empty<string?>());
            records.Add(record);
        }

        var parsed = ParseRecords(records);
        if (formulaRows.Count == 0) return parsed;
        return parsed.Select(x => formulaRows.Contains(x.RowNumber)
            ? x with { Errors = x.Errors.Append("Formula cells are not allowed in sales imports.").ToArray() }
            : x).ToArray();
    }

    private static IReadOnlyCollection<ParsedSalesImportRow> ParseRecords(IReadOnlyList<IReadOnlyList<string?>> records)
    {
        if (records.Count == 0) throw new InvalidDataException("The sales import file is empty.");
        var headers = records[0].Select((value, index) => (Name: NormalizeHeader(value), Index: index)).ToDictionary(x => x.Name, x => x.Index, StringComparer.OrdinalIgnoreCase);
        var dateColumn = Required(headers, "SALESDATE", "DATE");
        var channelColumn = Required(headers, "CHANNELCODE", "CHANNEL");
        var skuColumn = Required(headers, "CHANNELSKU", "SKU");
        var quantityColumn = Required(headers, "QUANTITY", "QTY", "SALESQUANTITY");
        var nameColumn = Optional(headers, "CHANNELPRODUCTNAME", "PRODUCTNAME", "PRODUCT");
        var result = new List<ParsedSalesImportRow>();

        for (var index = 1; index < records.Count; index++)
        {
            var record = records[index];
            if (record.All(string.IsNullOrWhiteSpace)) continue;
            var errors = new List<string>();
            var rawDate = Get(record, dateColumn);
            var rawChannel = Trim(Get(record, channelColumn));
            var rawSku = Trim(Get(record, skuColumn));
            var rawQuantity = Get(record, quantityColumn);
            var rawName = nameColumn.HasValue ? Trim(Get(record, nameColumn.Value)) : null;
            var date = ParseDate(rawDate);
            var quantity = ParseDecimal(rawQuantity);

            if (!date.HasValue) errors.Add("SalesDate is required and must be a valid date.");
            if (string.IsNullOrWhiteSpace(rawChannel)) errors.Add("ChannelCode is required.");
            if (string.IsNullOrWhiteSpace(rawSku)) errors.Add("ChannelSku is required.");
            if (!quantity.HasValue || quantity <= 0) errors.Add("Quantity must be greater than zero.");
            if (rawChannel?.Length > 20) errors.Add("ChannelCode cannot exceed 20 characters.");
            if (rawSku?.Length > 150) errors.Add("ChannelSku cannot exceed 150 characters.");
            if (rawName?.Length > 300) errors.Add("ChannelProductName cannot exceed 300 characters.");

            result.Add(new ParsedSalesImportRow(index + 1, date, rawChannel, rawSku, rawName, quantity, errors));
            if (result.Count > MaximumRows) throw new InvalidDataException($"Sales imports cannot exceed {MaximumRows:N0} data rows.");
        }

        if (result.Count == 0) throw new InvalidDataException("The sales import file contains no data rows.");
        return result;
    }

    private static List<IReadOnlyList<string?>> ReadCsvRecords(string text)
    {
        var rows = new List<IReadOnlyList<string?>>();
        var row = new List<string?>();
        var field = new StringBuilder();
        var quoted = false;
        for (var i = 0; i < text.Length; i++)
        {
            var ch = text[i];
            if (quoted)
            {
                if (ch == '"' && i + 1 < text.Length && text[i + 1] == '"') { field.Append('"'); i++; }
                else if (ch == '"') quoted = false;
                else field.Append(ch);
            }
            else if (ch == '"') quoted = true;
            else if (ch == ',') { row.Add(field.ToString()); field.Clear(); }
            else if (ch is '\r' or '\n')
            {
                if (ch == '\r' && i + 1 < text.Length && text[i + 1] == '\n') i++;
                row.Add(field.ToString()); field.Clear(); rows.Add(row.ToArray()); row.Clear();
            }
            else field.Append(ch);
        }

        if (quoted) throw new InvalidDataException("The CSV file contains an unterminated quoted field.");
        if (field.Length > 0 || row.Count > 0) { row.Add(field.ToString()); rows.Add(row.ToArray()); }
        return rows;
    }

    private static List<string> ReadSharedStrings(ZipArchive archive)
    {
        var entry = archive.GetEntry("xl/sharedStrings.xml");
        if (entry is null) return [];
        using var stream = entry.Open();
        var document = XDocument.Load(stream, LoadOptions.None);
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        return document.Descendants(ns + "si").Select(x => string.Concat(x.Descendants(ns + "t").Select(t => t.Value))).ToList();
    }

    private static void ValidateArchive(ZipArchive archive)
    {
        if (archive.Entries.Count > MaximumArchiveEntries) throw new InvalidDataException("The workbook contains too many archive entries.");
        long expandedBytes = 0;
        foreach (var entry in archive.Entries)
        {
            var normalized = entry.FullName.Replace('\\', '/');
            if (normalized.StartsWith('/') || normalized.Split('/').Any(segment => segment == ".."))
                throw new InvalidDataException("The workbook contains an unsafe archive path.");
            if (entry.Length > MaximumEntryBytes) throw new InvalidDataException("The workbook contains an oversized XML part.");
            expandedBytes += entry.Length;
            if (expandedBytes > MaximumExpandedBytes) throw new InvalidDataException("The expanded workbook is too large.");
        }
    }

    private static string GetFirstWorksheetPath(ZipArchive archive)
    {
        var workbookEntry = archive.GetEntry("xl/workbook.xml") ?? throw new InvalidDataException("The workbook definition is missing.");
        var relationshipsEntry = archive.GetEntry("xl/_rels/workbook.xml.rels") ?? throw new InvalidDataException("The workbook relationships are missing.");
        using var workbookStream = workbookEntry.Open();
        using var relationshipsStream = relationshipsEntry.Open();
        var workbook = XDocument.Load(workbookStream, LoadOptions.None);
        var relationships = XDocument.Load(relationshipsStream, LoadOptions.None);
        XNamespace main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        XNamespace rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
        XNamespace packageRel = "http://schemas.openxmlformats.org/package/2006/relationships";
        var relationshipId = (string?)workbook.Descendants(main + "sheet").FirstOrDefault()?.Attribute(rel + "id")
            ?? throw new InvalidDataException("The workbook has no worksheets.");
        var target = (string?)relationships.Descendants(packageRel + "Relationship").FirstOrDefault(x => (string?)x.Attribute("Id") == relationshipId)?.Attribute("Target")
            ?? throw new InvalidDataException("The worksheet relationship is invalid.");
        target = target.Replace('\\', '/').TrimStart('/');
        if (target.Split('/').Any(segment => segment == "..")) throw new InvalidDataException("The worksheet relationship contains an unsafe path.");
        return target.StartsWith("xl/", StringComparison.OrdinalIgnoreCase) ? target : "xl/" + target.TrimStart('.', '/');
    }

    private static int GetColumnIndex(string reference)
    {
        var result = 0;
        foreach (var ch in reference.TakeWhile(char.IsLetter)) result = result * 26 + char.ToUpperInvariant(ch) - 'A' + 1;
        return Math.Max(0, result - 1);
    }

    private static int Required(IReadOnlyDictionary<string, int> headers, params string[] names) =>
        Optional(headers, names) ?? throw new InvalidDataException($"Required column '{names[0]}' is missing.");

    private static int? Optional(IReadOnlyDictionary<string, int> headers, params string[] names)
    {
        foreach (var name in names) if (headers.TryGetValue(name, out var index)) return index;
        return null;
    }

    private static string NormalizeHeader(string? value) => new((value ?? string.Empty).Where(char.IsLetterOrDigit).Select(char.ToUpperInvariant).ToArray());
    private static string? Get(IReadOnlyList<string?> record, int index) => index < record.Count ? record[index] : null;
    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateOnly? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (DateOnly.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var date)) return date;
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var dateTime)) return DateOnly.FromDateTime(dateTime);
        if (double.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var serial) && serial is > 0 and < 2958466)
            return DateOnly.FromDateTime(DateTime.FromOADate(serial));
        return null;
    }

    private static decimal? ParseDecimal(string? value) =>
        decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var result) ? result : null;
}

internal static class ProcurementXlsxWriter
{
    private const string SpreadsheetNamespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

    public static byte[] CreateImportTemplate()
    {
        var rows = new List<IReadOnlyList<object?>>
        {
            new object?[] { "SalesDate", "ChannelCode", "ChannelSku", "ChannelProductName", "Quantity" },
            new object?[] { DateTime.UtcNow.Date.AddDays(-1), "AMZ", "AMZ-SKU-001", "Example product", 1m }
        };
        return CreateWorkbook([new SheetModel("Sales", rows, 1)]);
    }

    public static byte[] CreatePlanningRunWorkbook(PlanningRunDto run, string generatedBy)
    {
        var details = new List<IReadOnlyList<object?>>
        {
            new object?[] { "Procurement Planning Run", run.RunNumber },
            new object?[] { "From date", run.FromDate.ToDateTime(TimeOnly.MinValue) },
            new object?[] { "To date", run.ToDate.ToDateTime(TimeOnly.MinValue) },
            new object?[] { "Number of days", run.NumberOfDays },
            new object?[] { "Status", run.Status == 2 ? "Finalized" : "Draft" },
            new object?[] { "Calculated at (UTC)", run.CalculatedAtUtc },
            new object?[] { "Generated at (UTC)", DateTime.UtcNow },
            new object?[] { "Generated by", generatedBy },
            new object?[] { "Inventory basis", run.InventoryBasis },
            new object?[] { "Calculation version", run.CalculationVersion },
            new object?[] { "Notes", run.Notes }
        };

        var results = new List<IReadOnlyList<object?>>
        {
            new object?[]
            {
                "Material code", "Material name", "Unit", "Material requirement", "Average daily usage",
                "Lead-time days", "Lead-time source", "Lead-time demand", "Safety factor", "Safety stock",
                "Reorder point", "Current physical stock", "Shortage", "MOQ / workbook EOQ", "Order multiple",
                "Valid inbound stock", "Projected available stock", "Calculated suggested quantity", "Final quantity", "Adjustment reason", "Warnings", "Explanation"
            }
        };
        results.AddRange(run.Lines.Select(line => (IReadOnlyList<object?>)new object?[]
        {
            line.MaterialItemCode, line.MaterialItemName, line.UnitShortName, line.MaterialRequirement, line.AverageDailyUsage,
            line.LeadTimeDays, line.LeadTimeSource, line.LeadTimeDemand, line.SafetyFactor, line.SafetyStock,
            line.ReorderPoint, line.PhysicalStock, line.Shortage, line.MinimumOrderQuantity, line.OrderMultiple,
            line.InboundStock, line.ProjectedAvailableStock, line.CalculatedSuggestedQuantity, line.FinalQuantity, line.AdjustmentReason, line.WarningState, line.CalculationExplanation
        }));
        return CreateWorkbook([new SheetModel("Run Details", details, 0), new SheetModel("Results", results, 1)]);
    }

    private static byte[] CreateWorkbook(IReadOnlyList<SheetModel> sheets)
    {
        using var output = new MemoryStream();
        using (var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteEntry(archive, "[Content_Types].xml", writer =>
            {
                writer.WriteStartElement("Types", "http://schemas.openxmlformats.org/package/2006/content-types");
                writer.WriteStartElement("Default"); writer.WriteAttributeString("Extension", "rels"); writer.WriteAttributeString("ContentType", "application/vnd.openxmlformats-package.relationships+xml"); writer.WriteEndElement();
                writer.WriteStartElement("Default"); writer.WriteAttributeString("Extension", "xml"); writer.WriteAttributeString("ContentType", "application/xml"); writer.WriteEndElement();
                writer.WriteStartElement("Override"); writer.WriteAttributeString("PartName", "/xl/workbook.xml"); writer.WriteAttributeString("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"); writer.WriteEndElement();
                writer.WriteStartElement("Override"); writer.WriteAttributeString("PartName", "/xl/styles.xml"); writer.WriteAttributeString("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"); writer.WriteEndElement();
                for (var i = 0; i < sheets.Count; i++) { writer.WriteStartElement("Override"); writer.WriteAttributeString("PartName", $"/xl/worksheets/sheet{i + 1}.xml"); writer.WriteAttributeString("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"); writer.WriteEndElement(); }
                writer.WriteEndElement();
            });
            WriteEntry(archive, "_rels/.rels", writer =>
            {
                writer.WriteStartElement("Relationships", "http://schemas.openxmlformats.org/package/2006/relationships");
                writer.WriteStartElement("Relationship"); writer.WriteAttributeString("Id", "rId1"); writer.WriteAttributeString("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"); writer.WriteAttributeString("Target", "xl/workbook.xml"); writer.WriteEndElement();
                writer.WriteEndElement();
            });
            WriteEntry(archive, "xl/workbook.xml", writer =>
            {
                writer.WriteStartElement("workbook", SpreadsheetNamespace);
                writer.WriteAttributeString("xmlns", "r", null, "http://schemas.openxmlformats.org/officeDocument/2006/relationships");
                writer.WriteStartElement("sheets");
                for (var i = 0; i < sheets.Count; i++) { writer.WriteStartElement("sheet"); writer.WriteAttributeString("name", sheets[i].Name); writer.WriteAttributeString("sheetId", (i + 1).ToString(CultureInfo.InvariantCulture)); writer.WriteAttributeString("r", "id", null, $"rId{i + 1}"); writer.WriteEndElement(); }
                writer.WriteEndElement(); writer.WriteEndElement();
            });
            WriteEntry(archive, "xl/_rels/workbook.xml.rels", writer =>
            {
                writer.WriteStartElement("Relationships", "http://schemas.openxmlformats.org/package/2006/relationships");
                for (var i = 0; i < sheets.Count; i++) { writer.WriteStartElement("Relationship"); writer.WriteAttributeString("Id", $"rId{i + 1}"); writer.WriteAttributeString("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"); writer.WriteAttributeString("Target", $"worksheets/sheet{i + 1}.xml"); writer.WriteEndElement(); }
                writer.WriteStartElement("Relationship"); writer.WriteAttributeString("Id", $"rId{sheets.Count + 1}"); writer.WriteAttributeString("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"); writer.WriteAttributeString("Target", "styles.xml"); writer.WriteEndElement();
                writer.WriteEndElement();
            });
            WriteEntry(archive, "xl/styles.xml", WriteStyles);
            for (var i = 0; i < sheets.Count; i++) WriteEntry(archive, $"xl/worksheets/sheet{i + 1}.xml", writer => WriteSheet(writer, sheets[i]));
        }
        return output.ToArray();
    }

    private static void WriteSheet(XmlWriter writer, SheetModel sheet)
    {
        writer.WriteStartElement("worksheet", SpreadsheetNamespace);
        writer.WriteStartElement("sheetViews"); writer.WriteStartElement("sheetView"); writer.WriteAttributeString("workbookViewId", "0");
        if (sheet.FrozenRows > 0) { writer.WriteStartElement("pane"); writer.WriteAttributeString("ySplit", sheet.FrozenRows.ToString(CultureInfo.InvariantCulture)); writer.WriteAttributeString("topLeftCell", $"A{sheet.FrozenRows + 1}"); writer.WriteAttributeString("activePane", "bottomLeft"); writer.WriteAttributeString("state", "frozen"); writer.WriteEndElement(); }
        writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("cols");
        var maxColumns = sheet.Rows.Count == 0 ? 1 : sheet.Rows.Max(x => x.Count);
        for (var i = 1; i <= maxColumns; i++) { writer.WriteStartElement("col"); writer.WriteAttributeString("min", i.ToString()); writer.WriteAttributeString("max", i.ToString()); writer.WriteAttributeString("width", i <= 3 ? "22" : "18"); writer.WriteAttributeString("customWidth", "1"); writer.WriteEndElement(); }
        writer.WriteEndElement();
        writer.WriteStartElement("sheetData");
        for (var rowIndex = 0; rowIndex < sheet.Rows.Count; rowIndex++)
        {
            writer.WriteStartElement("row"); writer.WriteAttributeString("r", (rowIndex + 1).ToString(CultureInfo.InvariantCulture));
            var row = sheet.Rows[rowIndex];
            for (var columnIndex = 0; columnIndex < row.Count; columnIndex++) WriteCell(writer, row[columnIndex], rowIndex == 0 && sheet.FrozenRows > 0, rowIndex, columnIndex);
            writer.WriteEndElement();
        }
        writer.WriteEndElement(); writer.WriteEndElement();
    }

    private static void WriteCell(XmlWriter writer, object? value, bool header, int rowIndex, int columnIndex)
    {
        writer.WriteStartElement("c");
        writer.WriteAttributeString("r", $"{ColumnName(columnIndex)}{rowIndex + 1}");
        if (header) writer.WriteAttributeString("s", "1");
        if (value is DateTime dateTime)
        {
            writer.WriteAttributeString("s", "3"); writer.WriteElementString("v", SpreadsheetNamespace, dateTime.ToOADate().ToString(CultureInfo.InvariantCulture));
        }
        else if (value is DateOnly date)
        {
            writer.WriteAttributeString("s", "3"); writer.WriteElementString("v", SpreadsheetNamespace, date.ToDateTime(TimeOnly.MinValue).ToOADate().ToString(CultureInfo.InvariantCulture));
        }
        else if (value is decimal or double or float or int or long)
        {
            if (!header) writer.WriteAttributeString("s", "2"); writer.WriteElementString("v", SpreadsheetNamespace, Convert.ToString(value, CultureInfo.InvariantCulture));
        }
        else
        {
            writer.WriteAttributeString("t", "inlineStr"); writer.WriteStartElement("is"); writer.WriteStartElement("t");
            var text = SafeText(value?.ToString()); if (text.StartsWith(' ') || text.EndsWith(' ')) writer.WriteAttributeString("xml", "space", null, "preserve"); writer.WriteString(text); writer.WriteEndElement(); writer.WriteEndElement();
        }
        writer.WriteEndElement();
    }

    private static void WriteStyles(XmlWriter writer)
    {
        writer.WriteStartElement("styleSheet", SpreadsheetNamespace);
        writer.WriteStartElement("fonts"); writer.WriteAttributeString("count", "2");
        writer.WriteStartElement("font"); writer.WriteElementString("sz", "11"); writer.WriteElementString("name", "Calibri"); writer.WriteEndElement();
        writer.WriteStartElement("font"); writer.WriteElementString("b", string.Empty); writer.WriteElementString("color", string.Empty); writer.WriteStartElement("name"); writer.WriteAttributeString("val", "Calibri"); writer.WriteEndElement(); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("fills"); writer.WriteAttributeString("count", "3");
        writer.WriteStartElement("fill"); writer.WriteStartElement("patternFill"); writer.WriteAttributeString("patternType", "none"); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("fill"); writer.WriteStartElement("patternFill"); writer.WriteAttributeString("patternType", "gray125"); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("fill"); writer.WriteStartElement("patternFill"); writer.WriteAttributeString("patternType", "solid"); writer.WriteStartElement("fgColor"); writer.WriteAttributeString("rgb", "FF0F766E"); writer.WriteEndElement(); writer.WriteStartElement("bgColor"); writer.WriteAttributeString("indexed", "64"); writer.WriteEndElement(); writer.WriteEndElement(); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("borders"); writer.WriteAttributeString("count", "1"); writer.WriteStartElement("border"); writer.WriteElementString("left", string.Empty); writer.WriteElementString("right", string.Empty); writer.WriteElementString("top", string.Empty); writer.WriteElementString("bottom", string.Empty); writer.WriteElementString("diagonal", string.Empty); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("cellStyleXfs"); writer.WriteAttributeString("count", "1"); writer.WriteStartElement("xf"); writer.WriteAttributeString("numFmtId", "0"); writer.WriteAttributeString("fontId", "0"); writer.WriteAttributeString("fillId", "0"); writer.WriteAttributeString("borderId", "0"); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("cellXfs"); writer.WriteAttributeString("count", "4");
        WriteXf(writer, 0, 0, 0, false); WriteXf(writer, 0, 1, 2, true); WriteXf(writer, 4, 0, 0, true); WriteXf(writer, 14, 0, 0, true);
        writer.WriteEndElement(); writer.WriteEndElement();
    }

    private static void WriteXf(XmlWriter writer, int numFmtId, int fontId, int fillId, bool apply)
    {
        writer.WriteStartElement("xf"); writer.WriteAttributeString("numFmtId", numFmtId.ToString()); writer.WriteAttributeString("fontId", fontId.ToString()); writer.WriteAttributeString("fillId", fillId.ToString()); writer.WriteAttributeString("borderId", "0"); writer.WriteAttributeString("xfId", "0");
        if (apply) { writer.WriteAttributeString("applyNumberFormat", "1"); writer.WriteAttributeString("applyFont", "1"); writer.WriteAttributeString("applyFill", "1"); }
        writer.WriteEndElement();
    }

    private static void WriteEntry(ZipArchive archive, string name, Action<XmlWriter> write)
    {
        var entry = archive.CreateEntry(name, CompressionLevel.Fastest);
        using var stream = entry.Open();
        using var writer = XmlWriter.Create(stream, new XmlWriterSettings { Encoding = new UTF8Encoding(false), Indent = false, CloseOutput = false });
        writer.WriteStartDocument(); write(writer); writer.WriteEndDocument();
    }

    private static string SafeText(string? value)
    {
        value ??= string.Empty;
        return value.Length > 0 && value[0] is '=' or '+' or '-' or '@' ? "'" + value : value;
    }

    private static string ColumnName(int zeroBasedColumn)
    {
        var value = zeroBasedColumn + 1;
        var result = string.Empty;
        while (value > 0)
        {
            value--;
            result = (char)('A' + value % 26) + result;
            value /= 26;
        }
        return result;
    }

    private sealed record SheetModel(string Name, IReadOnlyList<IReadOnlyList<object?>> Rows, int FrozenRows);
}

namespace Cosmos.Contracts.Reports;

public sealed class PartyLedgerReportDto
{
    public long Id { get; set; }
    public Guid PartyId { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public DateOnly EntryDate { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public long SourceId { get; set; }
    public string EntryType { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal Balance { get; set; }
    public string? Notes { get; set; }
    public int TotalCount { get; set; }
}

public sealed class PartyStatementReportDto
{
    public Guid PartyId { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public DateOnly EntryDate { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public long SourceId { get; set; }
    public string EntryType { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal Balance { get; set; }
    public string? Notes { get; set; }
}

public sealed class ReceivableAgingReportDto
{
    public Guid PartyId { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; }
    public decimal Days0To30 { get; set; }
    public decimal Days31To60 { get; set; }
    public decimal Days61To90 { get; set; }
    public decimal DaysOver90 { get; set; }
}

public sealed class PayableAgingReportDto
{
    public Guid PartyId { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; }
    public decimal Days0To30 { get; set; }
    public decimal Days31To60 { get; set; }
    public decimal Days61To90 { get; set; }
    public decimal DaysOver90 { get; set; }
}

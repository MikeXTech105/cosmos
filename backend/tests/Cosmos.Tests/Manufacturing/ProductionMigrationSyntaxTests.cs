using Microsoft.SqlServer.TransactSql.ScriptDom;

namespace Cosmos.Tests.Manufacturing;

public sealed class ProductionMigrationSyntaxTests
{
    [Fact]
    public void New_migration_batches_and_embedded_dispatch_block_parse_as_SQL_Server()
    {
        var root = FindRoot();
        var scripts = Directory.GetFiles(Path.Combine(root, "backend", "database", "migrations"), "20261027_*.sql")
            .Concat(Directory.GetFiles(Path.Combine(root, "backend", "database", "migrations"), "20261028_*.sql"))
            .Append(Path.Combine(root,"backend","database","verification","production_workspace_reconciliation.sql")).ToArray();
        Assert.NotEmpty(scripts);
        foreach (var path in scripts)
        {
            var text = File.ReadAllText(path);
            var parser = new TSql160Parser(true);
            var tree = parser.Parse(new StringReader(text), out var errors);
            Assert.True(errors.Count == 0, $"{Path.GetFileName(path)}: {string.Join("; ", errors.Select(x => $"line {x.Line}: {x.Message}"))}");
            var visitor = new EmbeddedSqlVisitor(); tree.Accept(visitor);
            foreach (var sql in visitor.Sql)
            {
                parser.Parse(new StringReader(sql), out var embeddedErrors);
                Assert.True(embeddedErrors.Count == 0, $"{Path.GetFileName(path)} embedded SQL: {string.Join("; ", embeddedErrors.Select(x => x.Message))}");
            }
        }
    }

    internal static string FindRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current is not null && !Directory.Exists(Path.Combine(current.FullName, "backend", "database"))) current = current.Parent;
        return current?.FullName ?? throw new InvalidOperationException("Repository root was not found.");
    }

    private sealed class EmbeddedSqlVisitor : TSqlFragmentVisitor
    {
        public List<string> Sql { get; } = [];
        public override void ExplicitVisit(StringLiteral node)
        {
            // Only complete embedded batches, not REPLACE fragments ending in an unfinished IF.
            if ((node.Value.Length > 100 && node.Value.Replace("\r\n","\n").StartsWith("IF @TargetStatus=6\n", StringComparison.Ordinal)) || node.Value.StartsWith("CREATE TYPE dbo.", StringComparison.Ordinal)) Sql.Add(node.Value);
        }
    }
}

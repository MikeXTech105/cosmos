using System.Data;
using System.Threading;
using Dapper;

namespace Cosmos.Persistence.Dapper;

internal static class TemporalTypeHandlers
{
    private static int isConfigured;

    public static void Configure()
    {
        if (Interlocked.Exchange(ref isConfigured, 1) != 0) return;

        SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
        SqlMapper.AddTypeHandler(new NullableDateOnlyTypeHandler());
        SqlMapper.AddTypeHandler(new TimeOnlyTypeHandler());
        SqlMapper.AddTypeHandler(new NullableTimeOnlyTypeHandler());
    }
}

internal sealed class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly>
{
    public override void SetValue(IDbDataParameter parameter, DateOnly value)
    {
        parameter.DbType = DbType.Date;
        parameter.Value = value.ToDateTime(TimeOnly.MinValue);
    }

    public override DateOnly Parse(object value) =>
        value switch
        {
            DateOnly date => date,
            DateTime dateTime => DateOnly.FromDateTime(dateTime),
            string text when DateOnly.TryParse(text, out var date) => date,
            _ => throw new DataException($"Cannot convert {value.GetType()} to DateOnly.")
        };
}

internal sealed class NullableDateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly?>
{
    public override void SetValue(IDbDataParameter parameter, DateOnly? value)
    {
        parameter.DbType = DbType.Date;
        parameter.Value = value.HasValue
            ? value.Value.ToDateTime(TimeOnly.MinValue)
            : DBNull.Value;
    }

    public override DateOnly? Parse(object value) =>
        value is DBNull or null
            ? null
            : new DateOnlyTypeHandler().Parse(value);
}

internal sealed class TimeOnlyTypeHandler : SqlMapper.TypeHandler<TimeOnly>
{
    public override void SetValue(IDbDataParameter parameter, TimeOnly value)
    {
        parameter.DbType = DbType.Time;
        parameter.Value = value.ToTimeSpan();
    }

    public override TimeOnly Parse(object value) =>
        value switch
        {
            TimeOnly time => time,
            TimeSpan timeSpan => TimeOnly.FromTimeSpan(timeSpan),
            DateTime dateTime => TimeOnly.FromDateTime(dateTime),
            string text when TimeOnly.TryParse(text, out var time) => time,
            _ => throw new DataException($"Cannot convert {value.GetType()} to TimeOnly.")
        };
}

internal sealed class NullableTimeOnlyTypeHandler : SqlMapper.TypeHandler<TimeOnly?>
{
    public override void SetValue(IDbDataParameter parameter, TimeOnly? value)
    {
        parameter.DbType = DbType.Time;
        parameter.Value = value.HasValue
            ? value.Value.ToTimeSpan()
            : DBNull.Value;
    }

    public override TimeOnly? Parse(object value) =>
        value is DBNull or null
            ? null
            : new TimeOnlyTypeHandler().Parse(value);
}

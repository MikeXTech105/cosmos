const renderValue = (card) => {
  if (card.value === null || card.value === undefined || card.value === "") {
    return "—";
  }

  if (card.formatValue) {
    return card.formatValue(card.value);
  }

  if (typeof card.value === "number") {
    return card.value.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  }

  return String(card.value);
};

const StatCards = ({ cards = [], loading = false }) => {
  const visibleCards = cards.filter(Boolean);
  const gridClass =
    visibleCards.length === 2
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-2"
      : visibleCards.length >= 4
        ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={gridClass}>
      {visibleCards.map((card) => {
        const Icon = card.icon;
        const isLoading = card.loading ?? loading;

        return (
          <div
            key={card.key ?? card.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  {card.label}
                </p>
                {isLoading ? (
                  <div className="mt-1 h-7 w-20 animate-pulse rounded bg-slate-100" />
                ) : (
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                    {renderValue(card)}
                    {card.suffix ? (
                      <span className="ml-1 text-sm font-medium text-slate-500">
                        {card.suffix}
                      </span>
                    ) : null}
                  </p>
                )}
                {card.hint ? (
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {card.hint}
                  </p>
                ) : null}
              </div>
              {Icon ? (
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50">
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;

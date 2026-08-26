import MetricCard from "./MetricCard";

const CARD_TONES = ["brand", "sky", "amber", "emerald", "violet", "red"];

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
      ? "grid grid-cols-2 gap-3"
      : visibleCards.length >= 4
        ? "grid grid-cols-2 gap-3 lg:grid-cols-4"
        : "grid gap-3 sm:grid-cols-3";

  return (
    <div className={gridClass}>
      {visibleCards.map((card, index) => {
        const isLoading = card.loading ?? loading;

        return (
          <MetricCard
            key={card.key ?? card.label}
            icon={card.icon}
            label={card.label}
            labelClassName="text-[11px] font-medium tracking-wide text-slate-500"
            loading={isLoading}
            hint={card.hint}
            tone={card.tone ?? CARD_TONES[index % CARD_TONES.length]}
            valueClassName="text-2xl font-semibold"
            value={(
              <>
                {renderValue(card)}
                {card.suffix ? (
                  <span className="ml-1 text-sm font-medium text-slate-500">
                    {card.suffix}
                  </span>
                ) : null}
              </>
            )}
          />
        );
      })}
    </div>
  );
};

export default StatCards;

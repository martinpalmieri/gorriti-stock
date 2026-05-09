type SummaryCard = {
  label: string;
  value: string;
  detail: string;
  tone: string;
};

type SummaryCardsProps = {
  cards: SummaryCard[];
};

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <section
      aria-label="Indicadores principales"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-lg border border-stone-200 bg-white p-4"
        >
          <div
            className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${card.tone}`}
          >
            {card.label}
          </div>
          <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight">
            {card.value}
          </p>
          <p className="mt-1 text-sm text-stone-600">{card.detail}</p>
        </article>
      ))}
    </section>
  );
}


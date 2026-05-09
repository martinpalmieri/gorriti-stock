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
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200"
        >
          <div
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${card.tone}`}
          >
            {card.label}
          </div>
          <p className="mt-5 text-4xl font-bold tracking-tight">{card.value}</p>
          <p className="mt-2 text-sm text-stone-500">{card.detail}</p>
        </article>
      ))}
    </section>
  );
}


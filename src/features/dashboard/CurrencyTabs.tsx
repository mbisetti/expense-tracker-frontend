type CurrencyTabsProps = {
  currencies: string[];
  selected: string;
  onSelect: (currency: string) => void;
};

export function CurrencyTabs({ currencies, selected, onSelect }: CurrencyTabsProps) {
  if (currencies.length <= 1) {
    return null;
  }

  return (
    <div role="tablist" aria-label="Moneda" className="flex gap-2">
      {currencies.map((currency) => {
        const isSelected = currency === selected;
        return (
          <button
            key={currency}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(currency)}
            className={
              isSelected
                ? 'rounded-full border border-brand bg-brand-bg px-3 py-1 text-sm text-brand'
                : 'rounded-full border border-line bg-transparent px-3 py-1 text-sm text-body'
            }
          >
            {currency}
          </button>
        );
      })}
    </div>
  );
}

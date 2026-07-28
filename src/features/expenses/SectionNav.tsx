export type SectionLink = { id: string; label: string };

type SectionNavProps = {
  sections: SectionLink[];
  onGo: (id: string) => void;
};

// S29.1: chips de salto — la tab creció a 6 bloques y el scroll se hizo largo. Estilo del
// chip no-seleccionado de CurrencyTabs (acá no hay estado activo: son botones de ir-a).
export function SectionNav({ sections, onGo }: SectionNavProps) {
  return (
    <nav aria-label="Ir a sección" className="flex gap-2 overflow-x-auto pb-0.5">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onGo(s.id)}
          className="shrink-0 rounded-full border border-line bg-transparent px-3 py-1 text-sm text-body transition-colors hover:bg-surface-sunken"
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}

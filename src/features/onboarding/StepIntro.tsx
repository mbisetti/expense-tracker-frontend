type StepIntroProps = {
  title: string;
  /** Dos o tres líneas cortas. Es la mitad "guía" del paso; la otra mitad es el form de abajo. */
  lines: string[];
};

// La cabecera de cada paso. Existe para que los cinco expliquen igual: título, dos líneas y el
// formulario real. Un wizard donde cada paso se explica distinto se lee como cinco pantallas
// sueltas y no como una guía.
export function StepIntro({ title, lines }: StepIntroProps) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      {lines.map((line) => (
        <p key={line} className="text-sm text-body">
          {line}
        </p>
      ))}
    </div>
  );
}

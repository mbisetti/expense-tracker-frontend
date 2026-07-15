import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = {
  header?: ReactNode;
  /** Card clickeable: cursor-pointer + sombra al hover (§3: "sm = hover de card"). */
  interactive?: boolean;
} & HTMLAttributes<HTMLDivElement>;

// Card del design system (Bloque 3) — supersede a components/Card.tsx (que queda tal
// cual para no tocar pantallas existentes; se migra en S19).
export function Card({ header, interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-md border border-line bg-surface-elevated',
        interactive
          ? 'cursor-pointer transition-shadow duration-200 ease-out hover:shadow-sm'
          : '',
        className ?? '',
      ]
        .join(' ')
        .trim()}
      {...props}
    >
      {header && <div className="border-b border-line px-4 py-3">{header}</div>}
      <div className="p-4">{children}</div>
    </div>
  );
}

import type { HTMLAttributes } from 'react';

// Card base del design system: única fuente de la superficie redondeada
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-4${className ? ' ' + className : ''}`} {...props}>
      {children}
    </div>
  );
}

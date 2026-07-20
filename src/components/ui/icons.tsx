import type { SVGProps } from 'react';

// Íconos inline (estilo Lucide: stroke, 24x24, currentColor) — el proyecto no depende
// de lucide-react, así que se escriben a mano los pocos que usa la librería base.
// Siempre aria-hidden: el significado lo lleva el texto/label que los acompaña (§1.5/§4).
type IconProps = SVGProps<SVGSVGElement>;

function baseProps(props: IconProps): IconProps {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
    ...props,
  };
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

// Kebab (⋮) — menú/acciones. Sprint 22.4: entra al popup de "Ordenar cuentas".
export function DotsVerticalIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function AlertOctagonIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

// Ilustración simple para EmptyState (caja vacía) — mismo estilo stroke que el resto,
// no es un ícono semántico, así que no lleva color propio (lo hereda del contenedor).
export function EmptyBoxIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
      <path d="m20.7 7-8.7-5-8.7 5v10l8.7 5 8.7-5Z" />
    </svg>
  );
}

// Hamburger del header mobile (§ Sprint 19 B1) — abre el drawer con las rutas que no
// entran en el BottomNav (4 tabs) ni en el header horizontal (oculto debajo de `lg`).
export function MenuIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

// Logo de marca (Manguitos): mango minimalista. Colores de IDENTIDAD hardcodeados a
// propósito (dorado + hoja verde) — excepción admitida a la regla de tokens, igual que el
// color de una categoría es dato: un logo tiene su color propio, no es chrome tokenizado.
export function MangoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable={false} {...props}>
      <path
        d="M11.9 5.1c1-.8 2.2-1.3 3.5-1.2-.1 1-.5 1.9-1.2 2.6 1.7 1.6 2.6 3.9 2.5 6.5-.2 4.7-3.5 8.5-7.2 8.5-4.3 0-7.6-3.5-7.6-7.9 0-4.1 2.9-8.3 6.8-9 1.2-.2 2.3 0 3.2.5Z"
        fill="#F59E0B"
      />
      <path
        d="M18 3.7c.3-.9.3-1.8.1-2.5-.9.3-1.7 1-2.1 1.9.7 0 1.4.2 2 .6Z"
        fill="#34D399"
      />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function SpinnerIcon(props: IconProps) {
  const { className, ...rest } = props;
  return (
    <svg
      {...baseProps(rest)}
      className={`animate-spin motion-reduce:animate-none${className ? ' ' + className : ''}`}
    >
      <path className="opacity-25" d="M12 2a10 10 0 1 0 10 10" strokeOpacity={0.25} />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

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

// Flecha → — fila "debitar → acreditar" del TransferForm cross-currency (Sprint 23 D6).
// En móvil se rota 90° (apunta hacia abajo) cuando las mitades se apilan.
export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

// Calendario — botón del picker nativo dentro del DateField (Sprint 23 D1).
// S42: acompaña a los links que salen de la app (el home banking de una cuenta). La flecha que
// se escapa del recuadro es la convención universal de "esto abre otra pestaña".
export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
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

// Chevrons de navegación mensual (Sprint 24, PeriodNav de la tab Gastos).
export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m9 18 6-6-6-6" />
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

// Logo de marca (Maat): la pluma de la diosa, trazo sobre currentColor — el caller le da
// el color (text-brand en el header), así funciona sobre cualquier fondo y en los dos temas.
// Mismo glifo que public/favicon.svg, en versión outline para tamaños chicos.
export function FeatherIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...props}
    >
      <path d="M9.3 19.8 L9.3 7.2 C9.3 3.9 11.1 2.1 13.2 2.1 C15.3 2.1 16.5 3.9 16.4 6.9 C16.2 11.4 14.4 17.4 10.5 19.8 Z" />
      <path d="M11 9 L11 17" />
      <path d="M10 20 L9 22.3" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
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

// Campanita del centro de notificaciones (S34): cuerpo + badajo, como el bell de Lucide.
export function BellIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
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

// S35 (PWA): instalar la app — fila de Ajustes.
export function DownloadIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

// S35 (PWA): toast "hay una versión nueva".
export function RefreshIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

// S35 (PWA): banner "sin conexión" — el shell abre offline, los datos no (D8).
export function WifiOffIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 20h.01" />
      <path d="M8.5 16.43a5 5 0 0 1 7 0" />
      <path d="M5 12.86a10 10 0 0 1 5.17-2.69" />
      <path d="M19 12.86a10 10 0 0 0-2.01-1.52" />
      <path d="M2 8.82a15 15 0 0 1 4.18-2.64" />
      <path d="M22 8.82a15 15 0 0 0-11.29-3.76" />
      <path d="m2 2 20 20" />
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

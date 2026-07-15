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

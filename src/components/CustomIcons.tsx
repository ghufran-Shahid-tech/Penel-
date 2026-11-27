import type { ModuleId } from '../types/panel';

interface IconProps {
  className?: string;
}

export function GoldFireCrest({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 3L27 8.5V16.8C27 23.1 22.3 27.9 16 29.5C9.7 27.9 5 23.1 5 16.8V8.5L16 3Z"
        stroke="url(#gf-grad)"
        strokeWidth="2"
        fill="rgba(14, 165, 233, 0.1)"
      />
      <path
        d="M16 8.5L21 15.2L16 22.5L11 15.2L16 8.5Z"
        fill="url(#gf-grad)"
      />
      <circle cx="16" cy="15.2" r="2" fill="#06070A" />
      <defs>
        <linearGradient id="gf-grad" x1="5" y1="3" x2="27" y2="29.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ModuleVectorIcon({ id, className = 'w-5 h-5' }: { id: ModuleId; className?: string }) {
  switch (id) {
    case 'aim':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
        </svg>
      );
    case 'esp':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path d="M3 12s3.8-6.5 9-6.5S21 12 21 12s-3.8 6.5-9 6.5S3 12 3 12Z" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M4 4l3 3M20 4l-3 3M4 20l3-3M20 20l-3-3" strokeLinecap="round" opacity="0.6" />
        </svg>
      );
    case 'overlay':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <rect x="3" y="4" width="13" height="10" rx="2" />
          <path d="M8 18h11a2 2 0 0 0 2-2V9" strokeLinecap="round" />
          <path d="M6.5 8h6" strokeLinecap="round" />
        </svg>
      );
    case 'movement':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path d="M4 17l5-5 4 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 21h16" strokeLinecap="round" opacity="0.45" />
        </svg>
      );
    case 'damage':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path d="M12 3l8 4v5c0 5-3.4 8.3-8 9.5C7.4 20.3 4 17 4 12V7l8-4Z" />
          <path d="M9.5 12.5l2 2 3.8-4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'firerate':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path d="M13 2L4 14h7l-1 8 10-12h-7l0-8Z" strokeLinejoin="round" />
        </svg>
      );
  }
}

import type { ReactNode } from 'react';

/** Friendly illustration: a wallet with coins. */
function WalletIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden>
      <ellipse cx="80" cy="108" rx="56" ry="6" className="fill-surface-muted" />
      <rect x="26" y="34" width="108" height="66" rx="18" className="fill-lime" />
      <rect x="26" y="34" width="108" height="22" rx="11" className="fill-forest" opacity="0.92" />
      <rect x="98" y="58" width="36" height="24" rx="12" className="fill-lime-light" />
      <circle cx="112" cy="70" r="5" className="fill-forest" />
      <circle cx="56" cy="22" r="12" className="fill-lime-light stroke-forest" strokeWidth="3" />
      <text
        x="56"
        y="27"
        textAnchor="middle"
        fontSize="13"
        fontWeight="800"
        className="fill-forest"
      >
        ₹
      </text>
      <circle cx="84" cy="14" r="8" className="fill-lime stroke-forest" strokeWidth="2.5" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <WalletIllustration />
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

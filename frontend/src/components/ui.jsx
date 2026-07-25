/** Small shared presentational pieces: loading, empty, error, stats. */

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-navy-400" role="status">
      <Spinner className="h-6 w-6" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-xl text-navy-300">
        &#9634;
      </div>
      <h3 className="text-base font-semibold text-navy-700">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-navy-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange">
        !
      </div>
      <h3 className="text-base font-semibold text-navy-700">Couldn&apos;t load this page</h3>
      <p className="mt-1 max-w-sm text-sm text-navy-400">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost mt-5">
          Try again
        </button>
      )}
    </div>
  );
}

export function StatCard({ label, value, suffix, hint, tone = 'navy' }) {
  const tones = {
    navy: 'text-navy',
    teal: 'text-teal',
    orange: 'text-orange',
  };
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tones[tone]}`}>
        {value}
        {suffix && <span className="ml-0.5 text-lg font-semibold text-navy-300">{suffix}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone = 'teal' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const tones = { teal: 'bg-teal', orange: 'bg-orange', navy: 'bg-navy' };
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-navy-100"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${tones[tone]} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-navy-900/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-lift sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-navy-300 transition hover:text-navy-600"
          >
            &times;
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-navy-100 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

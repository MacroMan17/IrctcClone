import { useCallback, useEffect, useState } from 'react';

const cx = (...a) => a.filter(Boolean).join(' ');

export function Button({ variant = 'primary', size = 'md', className, loading, disabled, children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55';
  const sizes = { md: 'px-5 py-2.5 text-[15px]', sm: 'px-3 py-1.5 text-sm' };
  const variants = {
    primary: 'bg-lamp text-ink hover:bg-lamp-dark',
    board: 'bg-board text-white hover:bg-board-dark',
    outline: 'border border-line bg-white text-ink hover:bg-tint',
    danger: 'bg-stop text-white hover:bg-[#8f1d17]',
    ghost: 'text-board hover:bg-tint',
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

export function Spinner({ small }) {
  const s = small ? 'h-4 w-4 border-2' : 'h-8 w-8 border-[3px]';
  return <span role="status" aria-label="Loading" className={cx('inline-block animate-spin rounded-full border-current border-t-transparent', s)} />;
}

export const PageLoader = ({ label = 'Loading' }) => (
  <div className="flex flex-col items-center gap-3 py-20 text-muted"><Spinner /><p>{label}...</p></div>
);

export function ErrorBox({ error, onRetry, className }) {
  if (!error) return null;
  const msg = typeof error === 'string' ? error : error.message;
  const details = error.details?.length ? error.details : null;
  return (
    <div role="alert" className={cx('rounded-md border border-stop/30 bg-stop-tint px-4 py-3 text-[15px] text-stop', className)}>
      <p className="font-semibold">{msg}</p>
      {details && <ul className="mt-1 list-disc pl-5 text-sm">{details.map((d, i) => <li key={i}>{d.path ? `${d.path.split('.').pop()}: ` : ''}{d.message}</li>)}</ul>}
      {onRetry && <button onClick={onRetry} className="mt-2 text-sm font-semibold underline">Try again</button>}
    </div>
  );
}

export const EmptyState = ({ title, children, action }) => (
  <div className="rounded-lg border border-dashed border-line bg-white px-6 py-14 text-center">
    <h3 className="text-2xl font-semibold text-board">{title}</h3>
    {children && <p className="mx-auto mt-2 max-w-md text-muted">{children}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Card = ({ className, children, ...p }) => (
  <div className={cx('rounded-lg border border-line bg-white', className)} {...p}>{children}</div>
);

const STATUS = {
  CONFIRMED: ['Confirmed', 'bg-go-tint text-go'],
  CANCELLED: ['Cancelled', 'bg-stop-tint text-stop'],
  PENDING_PAYMENT: ['Payment pending', 'bg-wait-tint text-wait'],
  PAYMENT_FAILED: ['Payment failed', 'bg-stop-tint text-stop'],
  EXPIRED: ['Expired', 'bg-platform text-muted'],
};
export function StatusBadge({ status }) {
  const [label, cls] = STATUS[status] || [status, 'bg-platform text-muted'];
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold', cls)}>{label}</span>;
}

export function Field({ label, error, hint, id, className, children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {error && <p className="mt-1 text-sm text-stop" role="alert">{error}</p>}
    </div>
  );
}

export const inputCls = 'w-full rounded-md border border-line bg-white px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-board';

/** Run an async loader on mount / when deps change. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return fn().then((data) => setState({ data, error: null, loading: false })).catch((error) => setState({ data: null, error, loading: false }));
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

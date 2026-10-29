import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card, EmptyState, ErrorBox, Field, PageLoader, StatusBadge, inputCls } from '../components/ui.jsx';
import { DownloadTicketButton } from './BookingDetails.jsx';
import { fmtDateKey, fmtTime, rupees } from '../utils/format.js';

function Profile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ name: user.name, phone: user.phone || '', currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(null); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null); setMsg(null);
    const body = { name: f.name.trim(), ...(f.phone ? { phone: f.phone } : {}), ...(f.newPassword ? { currentPassword: f.currentPassword, newPassword: f.newPassword } : {}) };
    try { const d = await api.updateProfile(body); setUser(d.user); setF((x) => ({ ...x, currentPassword: '', newPassword: '' })); setMsg('Profile updated.'); } catch (x) { setErr(x); } finally { setBusy(false); }
  };
  return (
    <Card className="p-5">
      <h2 className="text-2xl font-semibold">Profile</h2>
      <p className="mb-3 text-sm text-muted">{user.email}</p>
      <form onSubmit={save} className="space-y-3" noValidate>
        <Field id="pn" label="Name"><input id="pn" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field id="pp" label="Mobile"><input id="pp" inputMode="numeric" maxLength={10} className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} /></Field>
        <details className="text-sm"><summary className="cursor-pointer font-semibold text-board">Change password</summary>
          <div className="mt-3 space-y-3">
            <Field id="cp" label="Current password"><input id="cp" type="password" autoComplete="current-password" className={inputCls} value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} /></Field>
            <Field id="np" label="New password"><input id="np" type="password" autoComplete="new-password" className={inputCls} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /></Field>
          </div></details>
        <ErrorBox error={err} />{msg && <p role="status" className="text-sm font-semibold text-go">{msg}</p>}
        <Button type="submit" size="sm" variant="board" loading={busy}>Save changes</Button>
      </form>
    </Card>
  );
}

export default function Dashboard() {
  const [scope, setScope] = useState('all');
  const [state, setState] = useState({ items: [], page: 1, total: 0, loading: true, error: null });

  const load = useCallback(async (page = 1, append = false) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const d = await api.myBookings({ scope, page, limit: 10 });
      setState((s) => ({ items: append ? [...s.items, ...d.bookings] : d.bookings, page: d.page, total: d.total, loading: false, error: null }));
    } catch (error) { setState((s) => ({ ...s, loading: false, error })); }
  }, [scope]);
  useEffect(() => { load(1); }, [load]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
      <section aria-labelledby="bk">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h1 id="bk" className="text-4xl font-bold text-board">My bookings</h1>
          <div role="tablist" aria-label="Filter bookings" className="flex rounded-md border border-line bg-white p-0.5 text-sm">
            {[['all', 'All'], ['upcoming', 'Upcoming'], ['past', 'Past']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={scope === k} onClick={() => setScope(k)} className={`rounded px-4 py-1.5 font-semibold ${scope === k ? 'bg-board text-white' : 'text-ink hover:bg-tint'}`}>{l}</button>
            ))}
          </div>
        </div>
        <ErrorBox error={state.error} onRetry={() => load(1)} />
        {state.loading && !state.items.length && <PageLoader label="Loading bookings" />}
        {!state.loading && !state.error && state.items.length === 0 && <EmptyState title="No bookings yet" action={<Link to="/" className="font-semibold text-board underline">Search trains</Link>}>When you book a ticket, it will show up here.</EmptyState>}
        <ul className="space-y-3">
          {state.items.map((b) => (
            <li key={b.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted">{b.train.number} {b.train.name}{b.pnr && <> - PNR <span className="font-semibold text-ink">{b.pnr}</span></>}</p>
                    <h2 className="text-2xl font-semibold">{b.from.name} to {b.to.name}</h2>
                    <p className="text-sm">{fmtDateKey(b.journeyDate)} - {fmtTime(b.departureAt)} - Class {b.classCode} - {b.passengers.length} passenger{b.passengers.length > 1 ? 's' : ''} - {rupees(b.fare.total)}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link to={`/booking/${b.id}`} className="text-sm font-semibold text-board underline">View details</Link>
                  {['CONFIRMED', 'CANCELLED'].includes(b.status) && <DownloadTicketButton booking={b} size="sm" variant="outline" />}
                  {['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(b.status) && <Link to={`/pay/${b.id}`} className="rounded-md bg-lamp px-3 py-1.5 text-sm font-semibold hover:bg-lamp-dark">Complete payment</Link>}
                  {b.status === 'CONFIRMED' && new Date(b.departureAt) > new Date() && <Link to={`/booking/${b.id}/cancel`} className="text-sm font-semibold text-stop underline">Cancel</Link>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
        {state.items.length < state.total && <div className="mt-4 text-center"><Button variant="outline" loading={state.loading} onClick={() => load(state.page + 1, true)}>Show more</Button></div>}
      </section>
      <aside><Profile /></aside>
    </div>
  );
}

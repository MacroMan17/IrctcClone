import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Card, EmptyState, ErrorBox, PageLoader, inputCls, useAsync } from '../components/ui.jsx';
import { CLASS_NAMES, duration, fmtDateKey, fmtDateShort, fmtTime, rupees } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

const WINDOWS = { any: ['', ''], morning: ['04:00', '11:59'], afternoon: ['12:00', '17:59'], evening: ['18:00', '23:59'], night: ['00:00', '03:59'] };

export default function SearchResults() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const from = sp.get('from') || ''; const to = sp.get('to') || ''; const date = sp.get('date') || '';
  const cls = sp.get('class') || ''; const sort = sp.get('sort') || 'departure'; const win = sp.get('window') || 'any';

  const { data, error, loading, reload } = useAsync(
    () => api.search({ from, to, date, class: cls, sort, departAfter: WINDOWS[win]?.[0], departBefore: WINDOWS[win]?.[1] }),
    [from, to, date, cls, sort, win]
  );
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };

  const bookUrl = (t, c) => `/book?scheduleId=${t.scheduleId}&trainId=${t.trainId}&from=${from}&to=${to}&date=${date}&class=${c.code}`;
  const choose = (t, c) => (user ? nav(bookUrl(t, c)) : nav('/login', { state: { from: bookUrl(t, c) } }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold text-board">{data ? `${data.from.name} to ${data.to.name}` : `${from} to ${to}`}</h1>
          <p className="text-muted">{date && fmtDateKey(date)}{data && ` - ${data.count} train${data.count === 1 ? '' : 's'}`}</p>
        </div>
        <Link to="/" className="text-sm font-semibold text-board underline">Modify search</Link>
      </div>

      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <div><label htmlFor="f-class" className="mb-1 block text-sm font-medium">Class</label>
          <select id="f-class" className={inputCls} value={cls} onChange={(e) => set('class', e.target.value)}>
            <option value="">All classes</option>{Object.entries(CLASS_NAMES).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
          </select></div>
        <div><label htmlFor="f-win" className="mb-1 block text-sm font-medium">Departure time</label>
          <select id="f-win" className={inputCls} value={win} onChange={(e) => set('window', e.target.value === 'any' ? '' : e.target.value)}>
            <option value="any">Any time</option><option value="morning">Morning (4 am - noon)</option><option value="afternoon">Afternoon (noon - 6 pm)</option><option value="evening">Evening (6 pm - midnight)</option><option value="night">Night (midnight - 4 am)</option>
          </select></div>
        <div><label htmlFor="f-sort" className="mb-1 block text-sm font-medium">Sort by</label>
          <select id="f-sort" className={inputCls} value={sort} onChange={(e) => set('sort', e.target.value)}>
            <option value="departure">Earliest departure</option><option value="duration">Shortest duration</option><option value="price">Lowest fare</option>
          </select></div>
      </Card>

      {loading && <PageLoader label="Searching trains" />}
      <ErrorBox error={error} onRetry={reload} />
      {data && data.count === 0 && (
        <EmptyState title="No trains found" action={<Link to="/" className="font-semibold text-board underline">Try another date or route</Link>}>
          No trains run between these stations on this date with the filters you chose.
        </EmptyState>
      )}

      <ul className="space-y-4">
        {data?.trains.map((t) => (
          <li key={t.scheduleId}>
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-tint px-4 py-2.5">
                <h2 className="text-2xl font-semibold text-board">{t.number} {t.name}</h2>
                <Link to={`/trains/${t.trainId}?from=${from}&to=${to}&date=${date}`} className="text-sm font-semibold text-board underline">Route and details</Link>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)] md:items-center">
                <div className="flex items-center gap-3">
                  <div className="text-center"><p className="text-3xl font-bold leading-none">{fmtTime(t.from.departureAt)}</p><p className="mt-1 text-sm text-muted">{t.from.code}</p></div>
                  <div className="flex-1 text-center text-sm text-muted">
                    <div className="relative h-px bg-line"><span className="absolute -top-1 left-0 h-2 w-2 rounded-full bg-board" /><span className="absolute -top-1 right-0 h-2 w-2 rounded-full bg-board" /></div>
                    <p className="mt-2">{duration(t.durationMinutes)} - {t.distanceKm} km</p>
                  </div>
                  <div className="text-center"><p className="text-3xl font-bold leading-none">{fmtTime(t.to.arrivalAt)}</p><p className="mt-1 text-sm text-muted">{t.to.code} {fmtDateShort(t.to.arrivalAt) !== fmtDateShort(t.from.departureAt) && <span>({fmtDateShort(t.to.arrivalAt)})</span>}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {t.classes.map((c) => {
                    const sold = c.available === 0; const disabled = sold || !t.bookable;
                    const tone = sold ? 'text-stop' : c.available < 10 ? 'text-wait' : 'text-go';
                    return (
                      <button key={c.code} disabled={disabled} onClick={() => choose(t, c)} aria-label={`${CLASS_NAMES[c.code]}, ${rupees(c.fare)}, ${sold ? 'sold out' : `${c.available} seats available`}`}
                        className="rounded-md border border-line p-2.5 text-left transition hover:border-board hover:bg-tint disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-line disabled:hover:bg-transparent">
                        <p className="flex items-baseline justify-between"><span className="text-xl font-semibold">{c.code}</span><span className="font-semibold">{rupees(c.fare)}</span></p>
                        <p className={`text-sm font-medium ${tone}`}>{!t.bookable ? 'Booking closed' : sold ? 'Sold out' : c.available < 10 ? `Only ${c.available} left` : `${c.available} available`}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

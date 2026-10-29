import { useState } from 'react';
import { api } from '../api/client.js';
import { Button, Card, EmptyState, ErrorBox, Field, PageLoader, StatusBadge, inputCls, useAsync } from '../components/ui.jsx';
import { localDateKey, rupees } from '../utils/format.js';

const TABS = ['Overview', 'Bookings', 'Trains', 'Stations', 'Schedules', 'Inventory'];
const CLASS_CODES = ['SL', '3A', '2A', '1A', 'CC', '2S'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Admin() {
  const [tab, setTab] = useState('Overview');
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl font-bold text-board">Admin dashboard</h1>
      <div role="tablist" aria-label="Admin sections" className="mt-4 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px rounded-t-md border border-b-0 px-4 py-2 font-semibold ${tab === t ? 'border-line bg-white text-board' : 'border-transparent text-muted hover:text-board'}`}>{t}</button>
        ))}
      </div>
      <div className="pt-6" role="tabpanel">
        {tab === 'Overview' && <Overview />}{tab === 'Bookings' && <Bookings />}{tab === 'Trains' && <Trains />}
        {tab === 'Stations' && <Stations />}{tab === 'Schedules' && <Schedules />}{tab === 'Inventory' && <Inventory />}
      </div>
    </div>
  );
}

const Stat = ({ label, value, tone = 'text-board' }) => <Card className="p-4"><p className="text-sm text-muted">{label}</p><p className={`font-display text-4xl font-bold ${tone}`}>{value}</p></Card>;

function Overview() {
  const { data, error, loading, reload } = useAsync(() => api.admin.stats());
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { totals: t, revenue: r, last7Days, topTrains } = data;
  const max = Math.max(1, ...last7Days.map((d) => d.bookings));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total bookings" value={t.bookings} /><Stat label="Confirmed" value={t.confirmed} tone="text-go" /><Stat label="Cancelled" value={t.cancelled} tone="text-stop" /><Stat label="Pending / expired" value={`${t.pending} / ${t.expired}`} tone="text-wait" />
        <Stat label="Gross revenue" value={rupees(r.gross)} /><Stat label="Refunded (simulated)" value={rupees(r.refunded)} /><Stat label="Net revenue" value={rupees(r.net)} tone="text-go" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-2xl font-semibold">Bookings, last 7 days</h2>
          {last7Days.length === 0 ? <p className="mt-3 text-muted">No bookings in the last week.</p> : (
            <ul className="mt-3 space-y-2">{last7Days.map((d) => <li key={d.date} className="flex items-center gap-3 text-sm"><span className="w-24 text-muted">{d.date}</span><span className="h-4 rounded bg-board" style={{ width: `${(d.bookings / max) * 100}%`, minWidth: 6 }} /><span className="font-semibold">{d.bookings}</span></li>)}</ul>)}
        </Card>
        <Card className="p-5">
          <h2 className="text-2xl font-semibold">Top trains</h2>
          {topTrains.length === 0 ? <p className="mt-3 text-muted">No confirmed bookings yet.</p> : (
            <ol className="mt-3 space-y-2">{topTrains.map((x) => <li key={x.number} className="flex justify-between text-[15px]"><span>{x.number} {x.name}</span><span className="font-semibold">{x.bookings} bookings, {x.passengers} pax</span></li>)}</ol>)}
        </Card>
      </div>
    </div>
  );
}

function Bookings() {
  const [status, setStatus] = useState(''); const [pnr, setPnr] = useState(''); const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => api.admin.bookings({ status, pnr, page, limit: 15 }), [status, pnr, page]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Field id="bs" label="Status"><select id="bs" className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option>{['CONFIRMED', 'CANCELLED', 'PENDING_PAYMENT', 'PAYMENT_FAILED', 'EXPIRED'].map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field id="bp" label="PNR"><input id="bp" className={inputCls} inputMode="numeric" maxLength={10} value={pnr} onChange={(e) => { setPnr(e.target.value.replace(/\D/g, '')); setPage(1); }} placeholder="Search by PNR" /></Field>
      </div>
      <ErrorBox error={error} onRetry={reload} />{loading && <PageLoader />}
      {data && data.bookings.length === 0 && <EmptyState title="No bookings match">Try a different filter.</EmptyState>}
      {data && data.bookings.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-platform text-muted"><tr><th className="px-4 py-2">PNR</th><th>User</th><th>Train</th><th>Route</th><th>Date</th><th>Fare</th><th className="pr-4">Status</th></tr></thead>
            <tbody>{data.bookings.map((b) => <tr key={b.id} className="border-t border-line"><td className="px-4 py-2.5 font-semibold">{b.pnr || '-'}</td><td>{b.user?.email}</td><td>{b.train.number}</td><td>{b.from.code} to {b.to.code}</td><td>{b.journeyDate}</td><td>{rupees(b.fare.total)}</td><td className="pr-4"><StatusBadge status={b.status} /></td></tr>)}</tbody>
          </table>
        </Card>
      )}
      {data && data.total > data.limit && <div className="mt-4 flex items-center justify-center gap-4"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm">Page {page} of {Math.ceil(data.total / data.limit)}</span><Button size="sm" variant="outline" disabled={page * data.limit >= data.total} onClick={() => setPage(page + 1)}>Next</Button></div>}
    </div>
  );
}

function useMutation(fn, onDone) {
  const [state, setState] = useState({ busy: false, error: null });
  const run = async (...a) => { setState({ busy: true, error: null }); try { const r = await fn(...a); setState({ busy: false, error: null }); onDone?.(r); return r; } catch (error) { setState({ busy: false, error }); return null; } };
  return [run, state];
}

function Stations() {
  const { data, error, loading, reload } = useAsync(() => api.stations());
  const empty = { code: '', name: '', city: '', state: '' };
  const [f, setF] = useState(empty); const [editing, setEditing] = useState(null);
  const [save, saving] = useMutation(() => (editing ? api.admin.updateStation(editing, f) : api.admin.createStation(f)), () => { setF(empty); setEditing(null); reload(); });
  const [del, delState] = useMutation((id) => api.admin.deleteStation(id), reload);
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="p-5 lg:self-start">
        <h2 className="mb-3 text-2xl font-semibold">{editing ? 'Edit station' : 'Add station'}</h2>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {[['code', 'Code (2-5 letters)'], ['name', 'Name'], ['city', 'City'], ['state', 'State']].map(([k, l]) => <Field key={k} id={`s-${k}`} label={l}><input id={`s-${k}`} className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required /></Field>)}
          <ErrorBox error={saving.error} />
          <div className="flex gap-2"><Button type="submit" loading={saving.busy}>{editing ? 'Save' : 'Add station'}</Button>{editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setF(empty); }}>Cancel</Button>}</div>
        </form>
      </Card>
      <div>
        <ErrorBox error={error || delState.error} onRetry={reload} />{loading && <PageLoader />}
        {data && <Card className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-platform text-muted"><tr><th className="px-4 py-2">Code</th><th>Name</th><th>City</th><th>State</th><th /></tr></thead>
          <tbody>{data.stations.map((s) => <tr key={s._id} className="border-t border-line"><td className="px-4 py-2 font-semibold">{s.code}</td><td>{s.name}</td><td>{s.city}</td><td>{s.state}</td>
            <td className="space-x-3 pr-4 text-right"><button className="font-semibold text-board underline" onClick={() => { setEditing(s._id); setF({ code: s.code, name: s.name, city: s.city, state: s.state }); }}>Edit</button><button className="font-semibold text-stop underline" onClick={() => window.confirm(`Delete ${s.code}?`) && del(s._id)}>Delete</button></td></tr>)}</tbody></table></Card>}
      </div>
    </div>
  );
}

const defaultClass = () => ({ on: false, baseFarePerKm: 1, reservationCharge: 20, coaches: 2, seatsPerCoach: 72 });

function Trains() {
  const { data, error, loading, reload } = useAsync(() => api.admin.trains());
  const [f, setF] = useState({ number: '', name: '', type: 'EXPRESS' });
  const [cls, setCls] = useState(Object.fromEntries(CLASS_CODES.map((c) => [c, defaultClass()])));
  const build = () => ({ ...f, classes: CLASS_CODES.filter((c) => cls[c].on).map((c) => ({ code: c, baseFarePerKm: Number(cls[c].baseFarePerKm), reservationCharge: Number(cls[c].reservationCharge), coaches: Array.from({ length: Number(cls[c].coaches) }, (_, i) => ({ name: `${c.replace(/\D/g, '') || c[0]}${i + 1}`.slice(0, 6), seats: Number(cls[c].seatsPerCoach) })) })) });
  const [save, saving] = useMutation(() => api.admin.createTrain(build()), () => { setF({ number: '', name: '', type: 'EXPRESS' }); reload(); });
  const [del, delState] = useMutation((id) => api.admin.deleteTrain(id), reload);
  const [toggle, toggleState] = useMutation((t) => api.admin.updateTrain(t._id, { isActive: !t.isActive }), reload);
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="p-5 lg:self-start">
        <h2 className="mb-3 text-2xl font-semibold">Add train</h2>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field id="t-num" label="Train number (5 digits)"><input id="t-num" className={inputCls} maxLength={5} value={f.number} onChange={(e) => setF({ ...f, number: e.target.value.replace(/\D/g, '') })} required /></Field>
          <Field id="t-name" label="Name"><input id="t-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
          <Field id="t-type" label="Type"><select id="t-type" className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['EXPRESS', 'SUPERFAST', 'RAJDHANI', 'SHATABDI', 'MAIL', 'PASSENGER'].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <fieldset className="space-y-2"><legend className="mb-1 text-sm font-medium">Classes and seat inventory</legend>
            {CLASS_CODES.map((c) => (
              <div key={c} className="rounded-md border border-line p-2.5">
                <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={cls[c].on} onChange={(e) => setCls({ ...cls, [c]: { ...cls[c], on: e.target.checked } })} /> {c}</label>
                {cls[c].on && <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {[['baseFarePerKm', 'Fare per km'], ['reservationCharge', 'Reservation'], ['coaches', 'Coaches'], ['seatsPerCoach', 'Seats / coach']].map(([k, l]) => <label key={k} className="block">{l}<input type="number" min="0" step={k === 'baseFarePerKm' ? '0.1' : '1'} className={`${inputCls} mt-0.5 py-1.5`} value={cls[c][k]} onChange={(e) => setCls({ ...cls, [c]: { ...cls[c], [k]: e.target.value } })} /></label>)}
                </div>}
              </div>
            ))}
          </fieldset>
          <ErrorBox error={saving.error} /><Button type="submit" loading={saving.busy}>Add train</Button>
        </form>
      </Card>
      <div><ErrorBox error={error || delState.error || toggleState.error} onRetry={reload} />{loading && <PageLoader />}
        {data && <Card className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-platform text-muted"><tr><th className="px-4 py-2">No.</th><th>Name</th><th>Classes</th><th>Active</th><th /></tr></thead>
          <tbody>{data.trains.map((t) => <tr key={t._id} className="border-t border-line"><td className="px-4 py-2 font-semibold">{t.number}</td><td>{t.name}</td><td>{t.classes.map((c) => c.code).join(', ')}</td>
            <td><button className="font-semibold text-board underline" onClick={() => toggle(t)}>{t.isActive ? 'Yes (disable)' : 'No (enable)'}</button></td>
            <td className="pr-4 text-right"><button className="font-semibold text-stop underline" onClick={() => window.confirm(`Delete train ${t.number} and its schedule?`) && del(t._id)}>Delete</button></td></tr>)}</tbody></table></Card>}
      </div>
    </div>
  );
}

const blankStop = () => ({ stationCode: '', arrival: '', departure: '', dayOffset: 0, distanceKm: 0 });

function Schedules() {
  const trains = useAsync(() => api.admin.trains());
  const stations = useAsync(() => api.stations());
  const schedules = useAsync(() => api.admin.schedules());
  const [trainId, setTrainId] = useState(''); const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [stops, setStops] = useState([blankStop(), blankStop()]);
  const setStop = (i, k, v) => setStops((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const body = () => ({ trainId, runningDays: days, stops: stops.map((s, i) => ({ stationCode: s.stationCode, ...(i > 0 && s.arrival ? { arrival: s.arrival } : {}), ...(i < stops.length - 1 && s.departure ? { departure: s.departure } : {}), dayOffset: Number(s.dayOffset), distanceKm: Number(s.distanceKm) })) });
  const [save, saving] = useMutation(() => api.admin.createSchedule(body()), () => { setStops([blankStop(), blankStop()]); setTrainId(''); schedules.reload(); });
  const [del, delState] = useMutation((id) => api.admin.deleteSchedule(id), schedules.reload);
  const used = new Set((schedules.data?.schedules || []).map((s) => s.train?._id));
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-3 text-2xl font-semibold">Add schedule</h2>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="sc-train" label="Train (without a schedule)"><select id="sc-train" className={inputCls} value={trainId} onChange={(e) => setTrainId(e.target.value)} required><option value="">Select a train</option>{(trains.data?.trains || []).filter((t) => !used.has(t._id)).map((t) => <option key={t._id} value={t._id}>{t.number} {t.name}</option>)}</select></Field>
            <fieldset><legend className="mb-1 text-sm font-medium">Runs on</legend><div className="flex flex-wrap gap-2">{DAYS.map((d, i) => <label key={d} className="flex items-center gap-1 rounded border border-line px-2 py-1 text-sm"><input type="checkbox" checked={days.includes(i)} onChange={(e) => setDays((x) => (e.target.checked ? [...x, i] : x.filter((y) => y !== i)))} />{d}</label>)}</div></fieldset>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="text-left text-muted"><tr><th>Station</th><th>Arrival</th><th>Departure</th><th>Day</th><th>Km from origin</th><th /></tr></thead>
            <tbody>{stops.map((s, i) => (
              <tr key={i}>
                <td className="pr-2 pb-2"><select aria-label={`Stop ${i + 1} station`} className={inputCls} value={s.stationCode} onChange={(e) => setStop(i, 'stationCode', e.target.value)} required><option value="">Station</option>{(stations.data?.stations || []).map((st) => <option key={st.code} value={st.code}>{st.code} - {st.name}</option>)}</select></td>
                <td className="pr-2 pb-2"><input aria-label={`Stop ${i + 1} arrival`} type="time" className={inputCls} disabled={i === 0} value={s.arrival} onChange={(e) => setStop(i, 'arrival', e.target.value)} required={i > 0} /></td>
                <td className="pr-2 pb-2"><input aria-label={`Stop ${i + 1} departure`} type="time" className={inputCls} disabled={i === stops.length - 1} value={s.departure} onChange={(e) => setStop(i, 'departure', e.target.value)} required={i < stops.length - 1} /></td>
                <td className="pr-2 pb-2"><input aria-label={`Stop ${i + 1} day`} type="number" min="0" max="5" className={`${inputCls} w-20`} value={s.dayOffset} onChange={(e) => setStop(i, 'dayOffset', e.target.value)} /></td>
                <td className="pr-2 pb-2"><input aria-label={`Stop ${i + 1} distance`} type="number" min="0" className={`${inputCls} w-28`} value={s.distanceKm} onChange={(e) => setStop(i, 'distanceKm', e.target.value)} /></td>
                <td className="pb-2">{stops.length > 2 && <button type="button" className="text-stop underline" onClick={() => setStops((x) => x.filter((_, j) => j !== i))}>Remove</button>}</td>
              </tr>))}</tbody></table></div>
          <p className="text-xs text-muted">Day 0 = the train's starting day, 1 = next day, and so on.</p>
          <ErrorBox error={saving.error} />
          <div className="flex gap-3"><Button type="button" variant="outline" onClick={() => setStops((x) => [...x.slice(0, -1), blankStop(), x[x.length - 1]])}>Add stop</Button><Button type="submit" loading={saving.busy}>Save schedule</Button></div>
        </form>
      </Card>
      <ErrorBox error={schedules.error || delState.error} />{schedules.loading && <PageLoader />}
      {schedules.data && <Card className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-platform text-muted"><tr><th className="px-4 py-2">Train</th><th>Stops</th><th>Days</th><th /></tr></thead>
        <tbody>{schedules.data.schedules.map((s) => <tr key={s._id} className="border-t border-line"><td className="px-4 py-2 font-semibold">{s.train?.number} {s.train?.name}</td><td>{s.stops.map((x) => x.stationCode).join(' > ')}</td><td>{s.runningDays.length === 7 ? 'Daily' : s.runningDays.map((d) => DAYS[d]).join(' ')}</td><td className="pr-4 text-right"><button className="font-semibold text-stop underline" onClick={() => window.confirm('Delete this schedule and its inventory?') && del(s._id)}>Delete</button></td></tr>)}</tbody></table></Card>}
    </div>
  );
}

function Inventory() {
  const schedules = useAsync(() => api.admin.schedules());
  const [sid, setSid] = useState(''); const [from, setFrom] = useState(localDateKey(0)); const [to, setTo] = useState(localDateKey(14));
  const [page, setPage] = useState(1);
  const list = useAsync(() => api.admin.inventory({ scheduleId: sid, page, limit: 20 }), [sid, page]);
  const [gen, genState] = useMutation(() => api.admin.generateInventory({ scheduleId: sid, from, to }), list.reload);
  const [del, delState] = useMutation((id) => api.admin.deleteInventory(id), list.reload);
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field id="i-s" label="Schedule"><select id="i-s" className={inputCls} value={sid} onChange={(e) => { setSid(e.target.value); setPage(1); }}><option value="">All schedules</option>{(schedules.data?.schedules || []).map((s) => <option key={s._id} value={s._id}>{s.train?.number} {s.train?.name}</option>)}</select></Field>
          <Field id="i-f" label="From"><input id="i-f" type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field id="i-t" label="To"><input id="i-t" type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Button onClick={() => gen()} disabled={!sid} loading={genState.busy}>Generate inventory</Button>
        </div>
        <p className="mt-2 text-xs text-muted">Creates seat maps for each running day in the range (max 60 days). Existing inventory is never overwritten.</p>
        <ErrorBox error={genState.error || delState.error} className="mt-3" />
      </Card>
      {list.loading && <PageLoader />}<ErrorBox error={list.error} onRetry={list.reload} />
      {list.data && list.data.inventory.length === 0 && <EmptyState title="No inventory">Generate inventory for a schedule, or search a date to create it automatically.</EmptyState>}
      {list.data && list.data.inventory.length > 0 && <Card className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-platform text-muted"><tr><th className="px-4 py-2">Train</th><th>Run date</th><th>Class</th><th>Total</th><th>Available</th><th>Held</th><th>Booked</th><th /></tr></thead>
        <tbody>{list.data.inventory.map((i) => <tr key={i.id} className="border-t border-line"><td className="px-4 py-2">{i.train?.number}</td><td>{i.runDate}</td><td className="font-semibold">{i.classCode}</td><td>{i.totalSeats}</td><td>{i.available}</td><td>{i.held}</td><td>{i.booked}</td><td className="pr-4 text-right">{i.held + i.booked === 0 && <button className="font-semibold text-stop underline" onClick={() => del(i.id)}>Delete</button>}</td></tr>)}</tbody></table></Card>}
      {list.data && list.data.total > list.data.limit && <div className="flex items-center justify-center gap-4"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm">Page {page} of {Math.ceil(list.data.total / list.data.limit)}</span><Button size="sm" variant="outline" disabled={page * list.data.limit >= list.data.total} onClick={() => setPage(page + 1)}>Next</Button></div>}
    </div>
  );
}


import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Button, Card, ErrorBox, Field, PageLoader, inputCls, useAsync } from '../components/ui.jsx';
import { CLASS_NAMES, fmtDateKey, fmtDateTime, rupees } from '../utils/format.js';

const blank = () => ({ name: '', age: '', gender: 'M' });
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/;

export default function Passengers() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const q = Object.fromEntries(sp.entries());
  const { scheduleId, trainId, from, to, date, class: classCode } = q;
  const [pax, setPax] = useState([blank()]);
  const [errors, setErrors] = useState([]);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const idemKey = useRef(crypto.randomUUID()); // same key on retries => never holds seats twice

  const { data, error, loading, reload } = useAsync(() => api.train(trainId, { from, to, date }), [trainId, from, to, date]);
  const cls = data?.journey?.classes.find((c) => c.code === classCode);
  const estimate = useMemo(() => (cls ? cls.fare.total * pax.length : 0), [cls, pax.length]);

  if (loading) return <PageLoader label="Preparing your booking" />;
  if (error || !data?.journey || !cls) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox error={error || 'This journey is not available.'} onRetry={reload} /></div>;
  const { train, journey } = data;

  const update = (i, k, v) => setPax((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const validate = () => pax.map((p) => {
    const e = {};
    if (p.name.trim().length < 2) e.name = 'Enter the passenger\'s full name';
    else if (!NAME_RE.test(p.name.trim())) e.name = 'Use letters, spaces, . \' - only';
    const age = Number(p.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) e.age = 'Age must be 1-120';
    return e;
  });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(); setErrors(errs);
    if (errs.some((x) => Object.keys(x).length)) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const { booking } = await api.createBooking({ scheduleId, from, to, date, classCode, passengers: pax.map((p) => ({ name: p.name.trim(), age: Number(p.age), gender: p.gender })) }, idemKey.current);
      nav(`/pay/${booking.id}`);
    } catch (err) { setSubmitError(err); } finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <h1 className="text-4xl font-bold text-board">Passenger details</h1>
          <p className="text-muted">Step 1 of 3 - passengers, then payment, then your ticket.</p>
        </div>
        {pax.map((p, i) => (
          <Card key={i} className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Passenger {i + 1}</h2>
              {pax.length > 1 && <button type="button" className="text-sm font-semibold text-stop underline" onClick={() => setPax((x) => x.filter((_, j) => j !== i))}>Remove</button>}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_100px_140px]">
              <Field id={`n${i}`} label="Full name" error={errors[i]?.name}><input id={`n${i}`} className={inputCls} value={p.name} maxLength={60} autoComplete="name" onChange={(e) => update(i, 'name', e.target.value)} aria-invalid={Boolean(errors[i]?.name)} /></Field>
              <Field id={`a${i}`} label="Age" error={errors[i]?.age}><input id={`a${i}`} inputMode="numeric" className={inputCls} value={p.age} maxLength={3} onChange={(e) => update(i, 'age', e.target.value.replace(/\D/g, ''))} aria-invalid={Boolean(errors[i]?.age)} /></Field>
              <Field id={`g${i}`} label="Gender"><select id={`g${i}`} className={inputCls} value={p.gender} onChange={(e) => update(i, 'gender', e.target.value)}><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select></Field>
            </div>
          </Card>
        ))}
        {pax.length < 6 && <Button type="button" variant="outline" onClick={() => setPax((p) => [...p, blank()])}>Add passenger ({pax.length}/6)</Button>}
        <ErrorBox error={submitError} />
        <Button type="submit" loading={submitting} className="w-full sm:w-auto sm:px-10">Reserve seats and continue</Button>
        <p className="text-sm text-muted">Seats are held for 10 minutes while you pay. Final fare is calculated by the server.</p>
      </form>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="p-5">
          <p className="text-sm text-muted">{train.number} {train.name}</p>
          <h2 className="mt-1 text-2xl font-semibold text-board">{journey.from} to {journey.to}</h2>
          <p className="mt-1 text-sm">{fmtDateKey(date)}</p>
          <p className="text-sm text-muted">Departs {fmtDateTime(journey.departureAt)}</p>
          <p className="mt-2 text-sm font-medium">{CLASS_NAMES[classCode]} ({classCode})</p>
          <hr className="my-4 border-line" />
          <div className="flex justify-between text-sm"><span>Fare per passenger</span><span>{rupees(cls.fare.perPassenger)}</span></div>
          <div className="mt-1 flex justify-between text-sm"><span>Passengers</span><span>{pax.length}</span></div>
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3"><span className="font-semibold">Estimated total</span><span className="text-2xl font-bold">{rupees(estimate)}</span></div>
          <p className="mt-1 text-xs text-muted">Includes GST. The server confirms the exact amount.</p>
          <Link to={`/search?from=${from}&to=${to}&date=${date}`} className="mt-4 inline-block text-sm font-semibold text-board underline">Choose a different train</Link>
        </Card>
      </aside>
    </div>
  );
}

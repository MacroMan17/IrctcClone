import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StationInput from '../components/StationInput.jsx';
import { Button, inputCls } from '../components/ui.jsx';
import { localDateKey } from '../utils/format.js';

const POPULAR = [['NDLS', 'BCT', 'Delhi to Mumbai'], ['NDLS', 'HWH', 'Delhi to Howrah'], ['NDLS', 'CDG', 'Delhi to Chandigarh'], ['SBC', 'MAS', 'Bengaluru to Chennai'], ['BCT', 'HYB', 'Mumbai to Hyderabad']];

export default function Home() {
  const nav = useNavigate();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [date, setDate] = useState(localDateKey(1));
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!from) er.from = 'Choose a source station';
    if (!to) er.to = 'Choose a destination station';
    if (from && to && from.code === to.code) er.to = 'Destination must differ from source';
    if (!date) er.date = 'Pick a journey date';
    setErrors(er);
    if (Object.keys(er).length) return;
    nav(`/search?from=${from.code}&to=${to.code}&date=${date}`);
  };
  const swap = () => { setFrom(to); setTo(from); };

  return (
    <>
      <section className="bg-board text-white">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 md:pb-20 md:pt-16">
          <h1 className="max-w-2xl text-5xl font-bold leading-[1.05] md:text-7xl">Find your train. <span className="text-lamp">Book in minutes.</span></h1>
          <p className="mt-4 max-w-xl text-lg text-white/80">Search trains, hold seats, pay and download your e-ticket. A working railway reservation demo you can explore end to end.</p>

          <form onSubmit={submit} noValidate className="mt-9 rounded-xl border border-white/15 bg-board-dark/70 p-4 md:p-5">
            <div className="grid items-start gap-3 md:grid-cols-[1fr_auto_1fr_200px_auto]">
              <StationInput label="From" placeholder="Station or city" value={from} onChange={setFrom} error={errors.from} />
              <button type="button" onClick={swap} aria-label="Swap source and destination" className="mt-6 hidden h-11 w-11 place-items-center rounded-full border border-white/25 text-white hover:bg-white/10 md:grid">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>
              </button>
              <StationInput label="To" placeholder="Station or city" value={to} onChange={setTo} error={errors.to} />
              <div>
                <label htmlFor="date" className="mb-1 block text-sm font-medium text-white/90">Journey date</label>
                <input id="date" type="date" className={inputCls} value={date} min={localDateKey(0)} max={localDateKey(120)} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.date)} />
                {errors.date && <p className="mt-1 text-sm text-lamp" role="alert">{errors.date}</p>}
              </div>
              <Button type="submit" className="mt-6 w-full md:w-auto md:px-8">Search trains</Button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/70">Popular routes:</span>
            {POPULAR.map(([f, t, label]) => (
              <Link key={f + t} to={`/search?from=${f}&to=${t}&date=${localDateKey(1)}`} className="rounded-full border border-white/25 px-3 py-1 text-white/90 hover:bg-white/10">{label}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
        {[
          ['Seats are held for you', 'When you start a booking, your seats are reserved for 10 minutes so nobody can take them while you pay.'],
          ['One ticket, one PNR', 'Every confirmed booking gets a unique 10-digit PNR and a downloadable PDF e-ticket with a verification QR code.'],
          ['Cancel with a clear refund', 'See exactly what you will get back before you cancel. Refunds follow a simple time-based policy.'],
        ].map(([t, d]) => (
          <div key={t}><h2 className="text-3xl font-semibold text-board">{t}</h2><p className="mt-2 text-muted">{d}</p></div>
        ))}
      </section>
    </>
  );
}

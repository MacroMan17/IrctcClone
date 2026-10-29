import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Button, Card, ErrorBox, Field, StatusBadge, inputCls } from '../components/ui.jsx';
import { CLASS_NAMES, fmtDateKey, fmtDateTime } from '../utils/format.js';

export default function PnrStatus() {
  const { pnr: param } = useParams();
  const nav = useNavigate();
  const [pnr, setPnr] = useState(param || '');
  const [state, setState] = useState({ loading: false, error: null, data: null });

  useEffect(() => {
    if (!param) return;
    setState({ loading: true, error: null, data: null });
    api.pnr(param).then((d) => setState({ loading: false, error: null, data: d.booking })).catch((error) => setState({ loading: false, error, data: null }));
  }, [param]);

  const submit = (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(pnr)) return setState({ loading: false, data: null, error: 'Enter a valid 10-digit PNR.' });
    return nav(`/pnr/${pnr}`);
  };
  const b = state.data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-4xl font-bold text-board">PNR status</h1>
      <p className="text-muted">Check a booking with its 10-digit PNR. No login needed. Passenger names are partly hidden.</p>
      <form onSubmit={submit} className="mt-5 flex flex-wrap items-end gap-3" noValidate>
        <Field id="pnr" label="PNR number" className="min-w-[220px] flex-1"><input id="pnr" className={inputCls} inputMode="numeric" maxLength={10} value={pnr} placeholder="10-digit PNR" onChange={(e) => setPnr(e.target.value.replace(/\D/g, ''))} /></Field>
        <Button type="submit" loading={state.loading}>Check status</Button>
      </form>
      <ErrorBox error={state.error} className="mt-4" />
      {b && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between bg-tint px-5 py-3"><p className="font-display text-3xl font-bold tracking-wider text-board">{b.pnr}</p><StatusBadge status={b.status} /></div>
          <div className="p-5">
            <h2 className="text-2xl font-semibold">{b.train.number} {b.train.name}</h2>
            <p>{b.from.name} ({b.from.code}) to {b.to.name} ({b.to.code})</p>
            <p className="text-sm text-muted">{fmtDateKey(b.journeyDate)} - {CLASS_NAMES[b.classCode]} - departs {fmtDateTime(b.departureAt)} IST</p>
            <table className="mt-4 w-full text-left text-[15px]"><thead className="text-sm text-muted"><tr><th className="py-1">#</th><th>Passenger</th><th>Age</th><th>Status</th><th>Coach / seat</th></tr></thead>
              <tbody>{b.passengers.map((p) => <tr key={p.index} className="border-t border-line"><td className="py-2">{p.index}</td><td>{p.name}</td><td>{p.age}</td><td className="font-semibold">{p.status}</td><td>{p.coach ? `${p.coach} / ${p.seat}` : '-'}</td></tr>)}</tbody></table>
          </div>
        </Card>
      )}
    </div>
  );
}

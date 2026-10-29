import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Button, Card, ErrorBox, PageLoader, StatusBadge, useAsync } from '../components/ui.jsx';
import { CLASS_NAMES, fmtDateKey, fmtDateTime, fmtTime, rupees } from '../utils/format.js';

export function TicketCard({ b }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-board px-6 py-4 text-white">
        <div><p className="text-sm text-white/70">PNR</p><p className="font-display text-4xl font-bold tracking-wider">{b.pnr || 'Not issued'}</p></div>
        <StatusBadge status={b.status} />
      </div>
      <div className="p-6">
        <p className="text-sm text-muted">{b.train.number}</p>
        <h2 className="text-3xl font-semibold">{b.train.name}</h2>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div><p className="text-3xl font-bold">{fmtTime(b.departureAt)}</p><p className="font-medium">{b.from.name}</p><p className="text-sm text-muted">{b.from.code}</p></div>
          <svg aria-hidden width="48" height="12" viewBox="0 0 48 12" className="text-board"><path d="M0 6h44M38 1l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
          <div className="text-right"><p className="text-3xl font-bold">{fmtTime(b.arrivalAt)}</p><p className="font-medium">{b.to.name}</p><p className="text-sm text-muted">{b.to.code}</p></div>
        </div>
        <p className="mt-3 text-sm text-muted">{fmtDateKey(b.journeyDate)} - {CLASS_NAMES[b.classCode]} ({b.classCode}) - departs {fmtDateTime(b.departureAt)} IST</p>
      </div>
      <div className="perforation" aria-hidden />
      <div className="overflow-x-auto px-6 pb-6 pt-3">
        <table className="w-full min-w-[420px] text-left text-[15px]">
          <thead className="text-sm text-muted"><tr><th className="py-1.5">Passenger</th><th>Age</th><th>Gender</th><th>Coach</th><th>Seat</th></tr></thead>
          <tbody>{b.passengers.map((p, i) => <tr key={i} className="border-t border-line"><td className="py-2 font-medium">{p.name}</td><td>{p.age}</td><td>{{ M: 'Male', F: 'Female', O: 'Other' }[p.gender]}</td><td>{p.coach || '-'}</td><td>{p.seat ?? '-'}</td></tr>)}</tbody>
        </table>
        <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt>Base fare</dt><dd>{rupees(b.fare.base)}</dd></div>
          <div className="flex justify-between"><dt>Reservation charge</dt><dd>{rupees(b.fare.reservationCharge)}</dd></div>
          <div className="flex justify-between"><dt>GST</dt><dd>{rupees(b.fare.gst)}</dd></div>
          <div className="flex items-baseline justify-between border-t border-line pt-2 font-semibold"><dt>Total fare</dt><dd className="text-xl">{rupees(b.fare.total)}</dd></div>
        </dl>
        {b.bookedAt && <p className="mt-4 text-sm text-muted">Booked on {fmtDateTime(b.bookedAt)} IST</p>}
      </div>
    </Card>
  );
}

export function DownloadTicketButton({ booking, size, variant = 'primary' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const go = async () => { setBusy(true); setErr(null); try { await api.downloadTicket(booking.id, booking.pnr); } catch (e) { setErr(e); } finally { setBusy(false); } };
  return (<><Button size={size} variant={variant} onClick={go} loading={busy}>Download ticket (PDF)</Button>{err && <span role="alert" className="text-sm text-stop">{err.message}</span>}</>);
}

export default function BookingDetails() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { data, error, loading, reload } = useAsync(() => api.booking(id), [id]);
  if (loading) return <PageLoader label="Loading booking" />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox error={error} onRetry={reload} /></div>;
  const b = data.booking;
  const fresh = sp.get('new') === '1' && b.status === 'CONFIRMED';
  const future = new Date(b.departureAt) > new Date();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {fresh && (
        <div role="status" className="mb-6 rounded-lg border border-go/30 bg-go-tint p-5">
          <h1 className="text-4xl font-bold text-go">Booking confirmed</h1>
          <p className="mt-1 text-ink/80">Your payment went through and your seats are booked. Keep your PNR handy, and download your e-ticket below.</p>
        </div>
      )}
      {!fresh && <h1 className="mb-5 text-4xl font-bold text-board">Booking details</h1>}

      <TicketCard b={b} />

      {b.status === 'CANCELLED' && b.cancellation && (
        <Card className="mt-5 border-stop/30 bg-stop-tint p-5">
          <h2 className="text-2xl font-semibold text-stop">Ticket cancelled</h2>
          <p className="mt-1">Cancelled on {fmtDateTime(b.cancelledAt)} IST. Refund: <strong>{rupees(b.cancellation.refundAmount)}</strong> ({b.cancellation.refundPercent}% of {rupees(b.fare.total)}, simulated).</p>
        </Card>
      )}
      {['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(b.status) && (
        <Card className="mt-5 p-5"><p>This booking is waiting for payment.</p><Link to={`/pay/${b.id}`} className="mt-2 inline-block font-semibold text-board underline">Complete payment</Link></Card>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {['CONFIRMED', 'CANCELLED'].includes(b.status) && <DownloadTicketButton booking={b} />}
        {b.status === 'CONFIRMED' && future && <Link to={`/booking/${b.id}/cancel`} className="rounded-md border border-stop px-5 py-2.5 font-semibold text-stop hover:bg-stop-tint">Cancel ticket</Link>}
        <Link to="/dashboard" className="font-semibold text-board underline">My bookings</Link>
      </div>
    </div>
  );
}

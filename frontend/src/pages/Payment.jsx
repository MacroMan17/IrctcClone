import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Button, Card, ErrorBox, PageLoader, useAsync } from '../components/ui.jsx';
import { fmtDateKey, fmtDateTime, rupees } from '../utils/format.js';

function useCountdown(iso) {
  const [left, setLeft] = useState(() => (iso ? new Date(iso) - Date.now() : 0));
  useEffect(() => {
    if (!iso) return undefined;
    const t = setInterval(() => setLeft(new Date(iso) - Date.now()), 1000);
    return () => clearInterval(t);
  }, [iso]);
  return Math.max(0, left);
}

export default function Payment() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, loading, reload } = useAsync(() => api.booking(id), [id]);
  const [busy, setBusy] = useState(null);
  const [payError, setPayError] = useState(null);
  const [failed, setFailed] = useState(false);
  const booking = data?.booking;
  const left = useCountdown(booking?.holdExpiresAt);

  if (loading) return <PageLoader label="Loading your booking" />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox error={error} onRetry={reload} /></div>;
  if (booking.status === 'CONFIRMED') return <Navigate to={`/booking/${id}`} replace />;

  const payable = ['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(booking.status);
  const expired = !payable || left <= 0;
  const mm = String(Math.floor(left / 60000)).padStart(2, '0'); const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');

  const pay = async (outcome) => {
    setBusy(outcome); setPayError(null); setFailed(false);
    try {
      const { payment } = await api.initiatePayment(id);
      const res = await api.confirmPayment(payment.id, outcome);
      if (res.booking.status === 'CONFIRMED') nav(`/booking/${id}?new=1`, { replace: true });
      else { setFailed(true); reload(); }
    } catch (e) { setPayError(e); if (['HOLD_EXPIRED', 'BOOKING_NOT_PAYABLE'].includes(e.code)) reload(); } finally { setBusy(null); }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div>
          <h1 className="text-4xl font-bold text-board">Review and pay</h1>
          <p className="text-muted">Step 2 of 3 - this is a mock payment. No real money is involved.</p>
        </div>

        {expired ? (
          <Card className="p-6">
            <h2 className="text-2xl font-semibold text-stop">Your seat hold has ended</h2>
            <p className="mt-1 text-muted">The seats were released so others can book them. Please search again to start a new booking.</p>
            <Link to="/" className="mt-4 inline-block font-semibold text-board underline">Search trains</Link>
          </Card>
        ) : (
          <Card className="p-6">
            <p role="timer" aria-live="off" className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${left < 120000 ? 'bg-stop-tint text-stop' : 'bg-wait-tint text-wait'}`}>Seats held for {mm}:{ss}</p>
            <h2 className="mt-4 text-2xl font-semibold">Mock payment gateway</h2>
            <p className="mt-1 text-muted">Choose an outcome to simulate. The server, not this page, decides whether your booking is confirmed.</p>
            {failed && <div role="alert" className="mt-4 rounded-md border border-stop/30 bg-stop-tint px-4 py-3 text-stop"><p className="font-semibold">Payment failed.</p><p className="text-sm">Your seats are still held. You can retry until the timer ends.</p></div>}
            <ErrorBox error={payError} className="mt-4" />
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => pay('SUCCESS')} loading={busy === 'SUCCESS'} disabled={Boolean(busy)}>{failed ? 'Retry payment' : 'Pay'} {rupees(booking.fare.total)}</Button>
              <Button variant="outline" onClick={() => pay('FAILURE')} loading={busy === 'FAILURE'} disabled={Boolean(busy)}>Simulate failed payment</Button>
            </div>
          </Card>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="p-5">
          <p className="text-sm text-muted">{booking.train.number} {booking.train.name}</p>
          <h2 className="mt-1 text-2xl font-semibold text-board">{booking.from.name} to {booking.to.name}</h2>
          <p className="mt-1 text-sm">{fmtDateKey(booking.journeyDate)} - Class {booking.classCode}</p>
          <p className="text-sm text-muted">Departs {fmtDateTime(booking.departureAt)}</p>
          <ul className="mt-3 text-sm">{booking.passengers.map((p, i) => <li key={i}>{i + 1}. {p.name}, {p.age}</li>)}</ul>
          <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>Base fare</dt><dd>{rupees(booking.fare.base)}</dd></div>
            <div className="flex justify-between"><dt>Reservation charge</dt><dd>{rupees(booking.fare.reservationCharge)}</dd></div>
            <div className="flex justify-between"><dt>GST</dt><dd>{rupees(booking.fare.gst)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd className="text-2xl">{rupees(booking.fare.total)}</dd></div>
          </dl>
        </Card>
      </aside>
    </div>
  );
}

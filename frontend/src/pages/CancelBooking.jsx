import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Button, Card, ErrorBox, PageLoader, useAsync } from '../components/ui.jsx';
import { fmtDateKey, fmtDateTime, rupees } from '../utils/format.js';

export default function CancelBooking() {
  const { id } = useParams();
  const { data, error, loading, reload } = useAsync(async () => ({ ...(await api.booking(id)), preview: await api.refundPreview(id) }), [id]);
  const [busy, setBusy] = useState(false);
  const [cancelErr, setCancelErr] = useState(null);
  const [done, setDone] = useState(null);

  if (loading) return <PageLoader label="Loading booking" />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox error={error} onRetry={reload} /></div>;
  const { booking: b, preview: p } = data;

  const confirm = async () => {
    setBusy(true); setCancelErr(null);
    try { setDone((await api.cancel(id)).booking); } catch (e) { setCancelErr(e); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card className="p-6">
          <h1 className="text-4xl font-bold text-board">Ticket cancelled</h1>
          <p className="mt-2">PNR <strong>{done.pnr}</strong> was cancelled on {fmtDateTime(done.cancelledAt)} IST.</p>
          <dl className="mt-4 space-y-1 text-[15px]">
            <div className="flex justify-between"><dt>Amount paid</dt><dd>{rupees(done.fare.total)}</dd></div>
            <div className="flex justify-between"><dt>Refund ({done.cancellation.refundPercent}%)</dt><dd className="font-semibold">{rupees(done.cancellation.refundAmount)}</dd></div>
          </dl>
          <p className="mt-3 text-sm text-muted">Refunds are simulated in this demo; no money moves. Your seats have been released.</p>
          <div className="mt-5 flex gap-4"><Link to={`/booking/${id}`} className="font-semibold text-board underline">View ticket</Link><Link to="/dashboard" className="font-semibold text-board underline">My bookings</Link></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-4xl font-bold text-board">Cancel ticket</h1>
      <Card className="mt-5 p-6">
        <p className="text-sm text-muted">PNR {b.pnr} - {b.train.number} {b.train.name}</p>
        <h2 className="text-2xl font-semibold">{b.from.name} to {b.to.name}</h2>
        <p className="text-sm">{fmtDateKey(b.journeyDate)} - departs {fmtDateTime(b.departureAt)} IST - {b.passengers.length} passenger(s)</p>

        {p.cancellable ? (
          <>
            <div className="mt-5 rounded-md bg-tint p-4">
              <p className="text-sm text-muted">Cancelling now ({p.hoursBeforeDeparture} hours before departure)</p>
              <p className="mt-1 text-3xl font-bold">{rupees(p.refundAmount)} <span className="text-lg font-medium text-muted">refund ({p.refundPercent}% of {rupees(p.amountPaid)})</span></p>
            </div>
            <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-board">Refund policy</summary>
              <ul className="mt-2 list-disc pl-5 text-muted">
                {p.tiers.map((t) => <li key={t.hoursBefore}>{t.hoursBefore}+ hours before departure: {t.percent}% refund</li>)}
                <li>Less than {p.tiers[p.tiers.length - 1]?.hoursBefore ?? 0} hours before departure: no refund</li>
              </ul></details>
            <ErrorBox error={cancelErr} className="mt-4" />
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="danger" onClick={confirm} loading={busy}>Yes, cancel this ticket</Button>
              <Link to={`/booking/${id}`} className="inline-flex items-center rounded-md border border-line px-5 py-2.5 font-semibold hover:bg-tint">Keep my ticket</Link>
            </div>
            <p className="mt-3 text-sm text-muted">This cannot be undone.</p>
          </>
        ) : (
          <div className="mt-5"><ErrorBox error={b.status === 'CANCELLED' ? 'This ticket is already cancelled.' : 'This ticket can no longer be cancelled.'} /><Link to={`/booking/${id}`} className="mt-4 inline-block font-semibold text-board underline">Back to ticket</Link></div>
        )}
      </Card>
    </div>
  );
}

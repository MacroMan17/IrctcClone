import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Card, ErrorBox, PageLoader, useAsync, Button } from '../components/ui.jsx';
import { CLASS_NAMES, fmtDateKey, fmtDateTime, rupees } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TrainDetails() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const from = sp.get('from') || ''; const to = sp.get('to') || ''; const date = sp.get('date') || '';
  const { data, error, loading, reload } = useAsync(() => api.train(id, { from, to, date }), [id, from, to, date]);

  if (loading) return <PageLoader label="Loading train" />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox error={error} onRetry={reload} /></div>;
  const { train, route, runningDays, journey } = data;
  const book = (code) => {
    const url = `/book?scheduleId=${journey.scheduleId}&trainId=${train._id}&from=${from}&to=${to}&date=${date}&class=${code}`;
    nav(user ? url : '/login', { state: { from: url } });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to={`/search?from=${from}&to=${to}&date=${date}`} className="text-sm font-semibold text-board underline">Back to results</Link>
      <h1 className="mt-2 text-4xl font-bold text-board">{train.number} {train.name}</h1>
      <p className="text-muted">{train.type.charAt(0) + train.type.slice(1).toLowerCase()} - runs {runningDays.length === 7 ? 'daily' : runningDays.map((d) => DAYS[d]).join(', ')}</p>

      {journey && (
        <Card className="mt-6 p-5">
          <h2 className="text-2xl font-semibold">Your journey: {journey.from} to {journey.to}</h2>
          <p className="text-muted">{fmtDateKey(date)} - departs {fmtDateTime(journey.departureAt)}, arrives {fmtDateTime(journey.arrivalAt)} - {journey.distanceKm} km</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {journey.classes.map((c) => (
              <div key={c.code} className="rounded-md border border-line p-3">
                <p className="flex justify-between text-lg font-semibold"><span>{CLASS_NAMES[c.code]} ({c.code})</span><span>{rupees(c.fare.perPassenger)}</span></p>
                <p className={`text-sm font-medium ${c.available === 0 ? 'text-stop' : 'text-go'}`}>{c.available === 0 ? 'Sold out' : `${c.available} of ${c.totalSeats} seats available`}</p>
                <Button size="sm" className="mt-3 w-full" disabled={c.available === 0 || !journey.bookable} onClick={() => book(c.code)}>{journey.bookable ? 'Book now' : 'Booking closed'}</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-6 overflow-x-auto">
        <h2 className="border-b border-line px-5 py-3 text-2xl font-semibold">Route</h2>
        <table className="w-full min-w-[480px] text-left text-[15px]">
          <thead className="bg-platform text-sm text-muted"><tr><th className="px-5 py-2">Station</th><th className="px-3 py-2">Arrives</th><th className="px-3 py-2">Departs</th><th className="px-3 py-2">Day</th><th className="px-5 py-2 text-right">Distance</th></tr></thead>
          <tbody>
            {route.map((s) => (
              <tr key={s.stationCode} className={`border-t border-line ${[from, to].includes(s.stationCode) ? 'bg-tint font-semibold' : ''}`}>
                <td className="px-5 py-2.5">{s.stationCode}</td><td className="px-3 py-2.5">{s.arrival || '-'}</td><td className="px-3 py-2.5">{s.departure || '-'}</td><td className="px-3 py-2.5">{s.dayOffset + 1}</td><td className="px-5 py-2.5 text-right">{s.distanceKm} km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

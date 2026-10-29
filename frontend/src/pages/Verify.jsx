import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Card, ErrorBox, PageLoader, useAsync } from '../components/ui.jsx';
import { fmtDateKey } from '../utils/format.js';

export default function Verify() {
  const { token } = useParams();
  const { data, error, loading } = useAsync(() => api.verifyTicket(token), [token]);
  if (loading) return <PageLoader label="Verifying ticket" />;
  if (error) return <div className="mx-auto max-w-xl px-4 py-10"><h1 className="mb-4 text-4xl font-bold text-stop">Ticket not recognised</h1><ErrorBox error="We could not verify this ticket. The code may be wrong or the ticket may not exist." /></div>;
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Card className={`p-6 ${data.valid ? 'border-go/40' : 'border-stop/40'}`}>
        <h1 className={`text-4xl font-bold ${data.valid ? 'text-go' : 'text-stop'}`}>{data.valid ? 'Valid ticket' : `Ticket ${data.status.toLowerCase()}`}</h1>
        <p className="mt-3 text-lg font-semibold">PNR {data.pnr}</p>
        <p>{data.train.number} {data.train.name}</p>
        <p>{data.from.name} to {data.to.name} - {fmtDateKey(data.journeyDate)} - Class {data.classCode}</p>
        <ul className="mt-3 text-sm text-muted">{data.passengers.map((p, i) => <li key={i}>{p.name}, {p.age}</li>)}</ul>
        <p className="mt-4 text-xs text-muted">Educational project: this verification is for demonstration only.</p>
      </Card>
    </div>
  );
}

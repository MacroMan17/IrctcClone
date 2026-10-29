import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-display text-8xl font-bold text-board/20">404</p>
      <h1 className="text-4xl font-bold text-board">This platform doesn't exist</h1>
      <p className="mt-2 text-muted">The page you are looking for was moved or never existed.</p>
      <Link to="/" className="mt-6 inline-block rounded-md bg-lamp px-6 py-2.5 font-semibold hover:bg-lamp-dark">Back to booking</Link>
    </div>
  );
}

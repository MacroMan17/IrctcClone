import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const link = ({ isActive }) => `rounded px-3 py-2 text-[15px] font-medium transition-colors ${isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const close = () => setOpen(false);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-lamp focus:px-3 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-30 bg-board shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <Link to="/" onClick={close} className="flex items-center gap-2.5 text-white">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-md border-2 border-lamp font-display text-xl font-bold text-lamp">R</span>
            <span className="font-display text-2xl font-bold tracking-wide">RailBook</span>
          </Link>
          <button className="rounded p-2 text-white md:hidden" aria-expanded={open} aria-controls="main-nav" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg>
          </button>
          <nav id="main-nav" className={`${open ? 'flex' : 'hidden'} absolute left-0 right-0 top-full flex-col gap-1 bg-board px-4 pb-4 md:static md:flex md:flex-row md:items-center md:gap-1 md:p-0`}>
            <NavLink to="/" end className={link} onClick={close}>Book tickets</NavLink>
            <NavLink to="/pnr" className={link} onClick={close}>PNR status</NavLink>
            {user && <NavLink to="/dashboard" className={link} onClick={close}>My bookings</NavLink>}
            {user?.role === 'ADMIN' && <NavLink to="/admin" className={link} onClick={close}>Admin</NavLink>}
            <span className="hidden h-6 w-px bg-white/25 md:mx-2 md:block" />
            {user ? (
              <>
                <span className="px-3 py-2 text-sm text-white/70">{user.name.split(' ')[0]}</span>
                <button className={link({ isActive: false })} onClick={() => { logout(); close(); nav('/'); }}>Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={link} onClick={close}>Log in</NavLink>
                <Link to="/register" onClick={close} className="rounded bg-lamp px-4 py-2 text-[15px] font-semibold text-ink hover:bg-lamp-dark">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 text-sm text-muted">
          RailBook is an independent educational project. It is not affiliated with IRCTC or Indian Railways and does not make real reservations. Sample timetable data only.
        </div>
      </footer>
    </div>
  );
}

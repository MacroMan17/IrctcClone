import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card, ErrorBox, Field, inputCls } from '../components/ui.jsx';

function Shell({ title, sub, children, footer }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-4xl font-bold text-board">{title}</h1>
      <p className="mb-5 text-muted">{sub}</p>
      <Card className="p-6">{children}</Card>
      <p className="mt-4 text-center text-[15px]">{footer}</p>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const dest = loc.state?.from || '/dashboard';
  if (user) return <Navigate to={dest} replace />;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await login({ email: f.email.trim(), password: f.password }); nav(dest, { replace: true }); } catch (x) { setErr(x); } finally { setBusy(false); }
  };
  return (
    <Shell title="Log in" sub="Welcome back. Log in to book and manage tickets." footer={<>New here? <Link to="/register" state={loc.state} className="font-semibold text-board underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBox error={err} />
        <Field id="email" label="Email"><input id="email" type="email" autoComplete="email" required className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field id="password" label="Password"><input id="password" type="password" autoComplete="current-password" required className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <Button type="submit" loading={busy} className="w-full">Log in</Button>
      </form>
    </Shell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const dest = loc.state?.from || '/dashboard';
  if (user) return <Navigate to={dest} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email address';
    if (f.phone && !/^[6-9]\d{9}$/.test(f.phone)) er.phone = 'Enter a valid 10-digit mobile number';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) er.password = 'At least 8 characters, with a letter and a digit';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true); setErr(null);
    try { await register({ name: f.name.trim(), email: f.email.trim(), password: f.password, ...(f.phone ? { phone: f.phone } : {}) }); nav(dest, { replace: true }); } catch (x) { setErr(x); } finally { setBusy(false); }
  };
  return (
    <Shell title="Create your account" sub="It takes under a minute." footer={<>Already registered? <Link to="/login" state={loc.state} className="font-semibold text-board underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBox error={err} />
        <Field id="rname" label="Full name" error={errors.name}><input id="rname" autoComplete="name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field id="remail" label="Email" error={errors.email}><input id="remail" type="email" autoComplete="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field id="rphone" label="Mobile number (optional)" error={errors.phone}><input id="rphone" inputMode="numeric" maxLength={10} autoComplete="tel" className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field id="rpass" label="Password" error={errors.password} hint="At least 8 characters, with a letter and a digit."><input id="rpass" type="password" autoComplete="new-password" className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <Button type="submit" loading={busy} className="w-full">Create account</Button>
      </form>
    </Shell>
  );
}

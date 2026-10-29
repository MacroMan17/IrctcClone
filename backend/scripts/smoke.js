'use strict';
/** End-to-end smoke test against a RUNNING server (after `npm run seed`).  Usage: API=http://localhost:5000 node scripts/smoke.js */
const fs = require('fs');
const API = (process.env.API || 'http://localhost:5000') + '/api';
const email = process.env.SMOKE_EMAIL || `smoke${Date.now()}@example.com`;
const password = 'SmokeTest123';

async function call(method, path, { token, body, headers } = {}) {
  const res = await fetch(API + path, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const isPdf = (res.headers.get('content-type') || '').includes('pdf');
  return { status: res.status, body: isPdf ? Buffer.from(await res.arrayBuffer()) : await res.json() };
}
const step = (n, msg) => console.log(`\n[${n}] ${msg}`);
const must = (cond, msg) => { if (!cond) { console.error('FAILED:', msg); process.exit(1); } console.log('  ok -', msg); };

(async () => {
  const d = new Date(Date.now() + 2 * 864e5 + 19800000); const date = d.toISOString().slice(0, 10);

  step(1, 'register + login');
  const reg = await call('POST', '/auth/register', { body: { name: 'Smoke Tester', email, password } });
  must(reg.status === 201, 'registered');
  const token = reg.body.data.token;

  step(2, `search NDLS -> HWH on ${date}`);
  const s = await call('GET', `/trains/search?from=NDLS&to=HWH&date=${date}&sort=price`);
  must(s.status === 200 && s.body.data.count > 0, `${s.body.data.count} train(s) found`);
  const t = s.body.data.trains[0];
  console.log(`  ${t.number} ${t.name} ${t.from.departure}->${t.to.arrival}`, t.classes.map((c) => `${c.code}:${c.available}`).join(' '));

  step(3, 'hold seats (2 passengers, 3A)');
  const hold = await call('POST', '/bookings', { token, headers: { 'Idempotency-Key': `smoke-${Date.now()}-key` }, body: { scheduleId: t.scheduleId, from: 'NDLS', to: 'HWH', date, classCode: '3A', passengers: [{ name: 'Asha Rao', age: 34, gender: 'F' }, { name: 'Ravi Rao', age: 36, gender: 'M' }] } });
  must(hold.status === 201 && hold.body.data.booking.status === 'PENDING_PAYMENT', `hold created, total Rs ${hold.body.data.booking.fare.total}`);
  const id = hold.body.data.booking.id;

  step(4, 'mock payment: failure, then retry success');
  let init = await call('POST', '/payments/mock-initiate', { token, body: { bookingId: id } });
  const fail = await call('POST', '/payments/mock-confirm', { token, body: { paymentId: init.body.data.payment.id, outcome: 'FAILURE' } });
  must(fail.body.data.booking.status === 'PAYMENT_FAILED', 'first payment failed, hold kept');
  init = await call('POST', '/payments/mock-initiate', { token, body: { bookingId: id } });
  const ok = await call('POST', '/payments/mock-confirm', { token, body: { paymentId: init.body.data.payment.id, outcome: 'SUCCESS' } });
  must(ok.body.data.booking.status === 'CONFIRMED' && /^\d{10}$/.test(ok.body.data.booking.pnr), `confirmed, PNR ${ok.body.data.booking.pnr}, seats ${ok.body.data.booking.passengers.map((p) => `${p.coach}/${p.seat}`).join(', ')}`);
  const pnr = ok.body.data.booking.pnr;

  step(5, 'PNR status (public) + PDF ticket');
  const p = await call('GET', `/bookings/pnr/${pnr}`);
  must(p.status === 200 && p.body.data.booking.passengers[0].name.includes('*'), `public PNR lookup, names masked: ${p.body.data.booking.passengers[0].name}`);
  const pdf = await call('GET', `/bookings/${id}/ticket.pdf`, { token });
  must(pdf.status === 200 && pdf.body.subarray(0, 5).toString() === '%PDF-', `PDF downloaded (${pdf.body.length} bytes)`);
  fs.writeFileSync(process.env.PDF_OUT || '/tmp/ticket.pdf', pdf.body);

  step(6, 'cancel + duplicate cancel');
  const prev = await call('GET', `/bookings/${id}/refund-preview`, { token });
  const c1 = await call('POST', `/bookings/${id}/cancel`, { token });
  must(c1.status === 200 && c1.body.data.booking.cancellation.refundAmount === prev.body.data.refundAmount, `cancelled, refund Rs ${c1.body.data.booking.cancellation.refundAmount} (${c1.body.data.booking.cancellation.refundPercent}%)`);
  const c2 = await call('POST', `/bookings/${id}/cancel`, { token });
  must(c2.status === 409 && c2.body.error.code === 'ALREADY_CANCELLED', 'duplicate cancellation rejected');
  console.log('\nSmoke test passed.');
})().catch((e) => { console.error(e); process.exit(1); });

'use strict';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

let fx;
before(h.setup);
after(h.teardown);
beforeEach(async () => { await h.resetDb(); fx = await h.createFixture({ slSeats: 10 }); });

const getPdf = (id, auth) => h.api().get(`/api/bookings/${id}/ticket.pdf`).set(auth).buffer(true).parse((res, done) => { const c = []; res.on('data', (d) => c.push(d)); res.on('end', () => done(null, Buffer.concat(c))); });

test('confirmed booking downloads a valid PDF generated from the saved record', async () => {
  const u = await h.registerUser();
  const { bookingId, conf } = await h.bookAndPay(fx, u, { passengers: h.passengers(2) });
  const res = await getPdf(bookingId, u.auth);
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /application\/pdf/);
  assert.match(res.headers['content-disposition'], new RegExp(`ticket-${conf.body.data.booking.pnr}\\.pdf`));
  assert.equal(res.body.subarray(0, 5).toString(), '%PDF-');
  assert.ok(res.body.length > 3000);
  assert.ok(res.body.subarray(-8).toString().includes('%%EOF'));
});

test('ticket is built from the DB: tampering with the saved fare changes the PDF', async () => {
  const u = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, u);
  const a = await getPdf(bookingId, u.auth);
  await h.mongoose.model('Booking').updateOne({ _id: bookingId }, { $set: { 'passengers.0.name': 'Changed Name' } });
  const b = await getPdf(bookingId, u.auth);
  assert.notDeepEqual(a.body, b.body);
});

test('no ticket for unpaid / failed bookings (409)', async () => {
  const u = await h.registerUser();
  const hold = await h.holdBooking(fx, u);
  const res = await h.api().get(`/api/bookings/${hold.body.data.booking.id}/ticket.pdf`).set(u.auth);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'TICKET_NOT_AVAILABLE');
});

test('download authorization: anonymous 401, other user 403, unknown 404, bad id 400', async () => {
  const alice = await h.registerUser(); const bob = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, alice);
  assert.equal((await h.api().get(`/api/bookings/${bookingId}/ticket.pdf`)).status, 401);
  assert.equal((await h.api().get(`/api/bookings/${bookingId}/ticket.pdf`).set(bob.auth)).status, 403);
  assert.equal((await h.api().get(`/api/bookings/${new h.mongoose.Types.ObjectId()}/ticket.pdf`).set(alice.auth)).status, 404);
  assert.equal((await h.api().get('/api/bookings/xyz/ticket.pdf').set(alice.auth)).status, 400);
});

test('QR verification: opaque token works publicly, wrong token/ID mismatch fail, names are masked', async () => {
  const u = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, u, { passengers: [{ name: 'Priya Sharma', age: 31, gender: 'F' }] });
  const booking = await h.mongoose.model('Booking').findById(bookingId);
  const token = booking.verificationToken;
  assert.ok(token.length >= 30);
  assert.equal(token.includes(String(bookingId)), false); // opaque

  const ok = await h.api().get(`/api/tickets/verify/${token}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.valid, true);
  assert.equal(ok.body.data.passengers[0].name, 'P**** S*****');
  assert.equal(JSON.stringify(ok.body).includes('fare'), false);

  const viaId = await h.api().get(`/api/bookings/${bookingId}/ticket-verification?token=${token}`);
  assert.equal(viaId.status, 200);
  const wrong = await h.api().get(`/api/bookings/${bookingId}/ticket-verification?token=${'a'.repeat(32)}`);
  assert.equal(wrong.status, 404);
  assert.equal((await h.api().get(`/api/tickets/verify/${'b'.repeat(32)}`)).status, 404);
  assert.equal((await h.api().get('/api/tickets/verify/short')).status, 404);
  assert.equal((await h.api().get(`/api/bookings/${bookingId}/ticket-verification`)).status, 400);
});

test('cancelled tickets still download (marked cancelled) and verification reports invalid', async () => {
  const u = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, u);
  await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
  const pdf = await getPdf(bookingId, u.auth);
  assert.equal(pdf.status, 200);
  const token = (await h.mongoose.model('Booking').findById(bookingId)).verificationToken;
  const v = await h.api().get(`/api/tickets/verify/${token}`);
  assert.equal(v.body.data.valid, false);
  assert.equal(v.body.data.status, 'CANCELLED');
});

test('ticket stays on a single A4 page, even with 6 passengers', async () => {
  const u = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, u, { passengers: h.passengers(6) });
  const res = await getPdf(bookingId, u.auth);
  const pages = (res.body.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
  assert.equal(pages, 1);
});

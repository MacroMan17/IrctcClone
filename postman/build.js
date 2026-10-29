// Generates RailBook.postman_collection.json  ->  node postman/build.js
const fs = require('fs');
const bearer = (v) => ({ type: 'bearer', bearer: [{ key: 'token', value: `{{${v}}}`, type: 'string' }] });
const test = (...lines) => [{ listen: 'test', script: { type: 'text/javascript', exec: lines } }];
const req = (name, method, path, { body, auth, tests, headers = [], desc } = {}) => ({
  name, ...(tests ? { event: test(...tests) } : {}),
  request: {
    method, description: desc, header: [...(body ? [{ key: 'Content-Type', value: 'application/json' }] : []), ...headers],
    ...(auth ? { auth: bearer(auth) } : { auth: { type: 'noauth' } }),
    url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.replace(/^\//, '').split('?')[0].split('/'), query: path.includes('?') ? path.split('?')[1].split('&').map((p) => { const [key, value] = p.split('='); return { key, value }; }) : undefined },
    ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } } : {}),
  },
});
const ok = (code = 200) => `pm.test('status is ${code}', () => pm.response.to.have.status(${code}));`;
const json = 'const j = pm.response.json();';

const collection = {
  info: { name: 'RailBook API', description: 'Educational IRCTC-inspired reservation API. Run folders top to bottom: Auth -> Search -> Booking flow -> Cancellation. Set adminEmail/adminPassword to the seeded admin for the Admin folder.', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5000/api' }, { key: 'email', value: 'postman.user@example.com' }, { key: 'password', value: 'Postman123' },
    { key: 'adminEmail', value: 'admin@example.com' }, { key: 'adminPassword', value: 'change-this-admin-password' },
  ],
  event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: ["if (!pm.collectionVariables.get('date') || pm.collectionVariables.get('date') < new Date().toISOString().slice(0,10)) {", "  pm.collectionVariables.set('date', new Date(Date.now() + 2*864e5).toISOString().slice(0,10));", '}'] } }],
  item: [
    { name: '1. Auth', item: [
      req('Health', 'GET', '/health', { tests: [ok()] }),
      req('Register', 'POST', '/auth/register', { body: { name: 'Postman User', email: '{{email}}', password: '{{password}}' }, tests: [`pm.test('201 or already registered', () => pm.expect([201, 409]).to.include(pm.response.code));`, `if (pm.response.code === 201) pm.collectionVariables.set('token', pm.response.json().data.token);`] }),
      req('Login', 'POST', '/auth/login', { body: { email: '{{email}}', password: '{{password}}' }, tests: [ok(), json, `pm.collectionVariables.set('token', j.data.token);`] }),
      req('Login - wrong password (401)', 'POST', '/auth/login', { body: { email: '{{email}}', password: 'WrongPass1' }, tests: [ok(401), `pm.test('generic error', () => pm.expect(pm.response.json().error.code).to.eql('INVALID_CREDENTIALS'));`] }),
      req('Me', 'GET', '/auth/me', { auth: 'token', tests: [ok()] }),
      req('Update profile', 'PATCH', '/users/me', { auth: 'token', body: { name: 'Postman User', phone: '9876543210' }, tests: [ok()] }),
    ] },
    { name: '2. Search', item: [
      req('Stations autocomplete', 'GET', '/stations?q=delhi', { tests: [ok()] }),
      req('Search NDLS -> HWH', 'GET', '/trains/search?from=NDLS&to=HWH&date={{date}}&sort=price', { tests: [ok(), json, `pm.expect(j.data.count).to.be.above(0);`, `const t = j.data.trains[0]; pm.collectionVariables.set('scheduleId', t.scheduleId); pm.collectionVariables.set('trainId', t.trainId);`] }),
      req('Search - same station (400)', 'GET', '/trains/search?from=NDLS&to=NDLS&date={{date}}', { tests: [ok(400)] }),
      req('Search - unknown station (404)', 'GET', '/trains/search?from=NDLS&to=ZZZ&date={{date}}', { tests: [ok(404)] }),
      req('Train details', 'GET', '/trains/{{trainId}}?from=NDLS&to=HWH&date={{date}}', { tests: [ok()] }),
    ] },
    { name: '3. Booking flow', item: [
      req('Create booking (hold seats)', 'POST', '/bookings', { auth: 'token', headers: [{ key: 'Idempotency-Key', value: '{{$guid}}' }], body: { scheduleId: '{{scheduleId}}', from: 'NDLS', to: 'HWH', date: '{{date}}', classCode: '3A', passengers: [{ name: 'Asha Rao', age: 34, gender: 'F' }, { name: 'Ravi Rao', age: 36, gender: 'M' }] }, tests: [ok(201), json, `pm.expect(j.data.booking.status).to.eql('PENDING_PAYMENT'); pm.collectionVariables.set('bookingId', j.data.booking.id);`] }),
      req('Initiate payment', 'POST', '/payments/mock-initiate', { auth: 'token', body: { bookingId: '{{bookingId}}' }, tests: [ok(201), json, `pm.collectionVariables.set('paymentId', j.data.payment.id);`] }),
      req('Confirm payment (SUCCESS)', 'POST', '/payments/mock-confirm', { auth: 'token', body: { paymentId: '{{paymentId}}', outcome: 'SUCCESS' }, tests: [ok(), json, `pm.expect(j.data.booking.status).to.eql('CONFIRMED'); pm.collectionVariables.set('pnr', j.data.booking.pnr);`] }),
      req('Confirm payment again (idempotent replay)', 'POST', '/payments/mock-confirm', { auth: 'token', body: { paymentId: '{{paymentId}}', outcome: 'SUCCESS' }, tests: [ok(), `pm.expect(pm.response.json().data.replayed).to.eql(true);`] }),
      req('Booking details', 'GET', '/bookings/{{bookingId}}', { auth: 'token', tests: [ok()] }),
      req('My bookings', 'GET', '/bookings/my-bookings?scope=upcoming', { auth: 'token', tests: [ok()] }),
      req('PNR status (public)', 'GET', '/bookings/pnr/{{pnr}}', { tests: [ok()] }),
      req('Download ticket PDF', 'GET', '/bookings/{{bookingId}}/ticket.pdf', { auth: 'token', tests: [ok(), `pm.expect(pm.response.headers.get('Content-Type')).to.include('application/pdf');`], desc: 'Use "Send and Download" in Postman to save the PDF.' }),
    ] },
    { name: '4. Cancellation', item: [
      req('Refund preview', 'GET', '/bookings/{{bookingId}}/refund-preview', { auth: 'token', tests: [ok()] }),
      req('Cancel booking', 'POST', '/bookings/{{bookingId}}/cancel', { auth: 'token', tests: [ok(), `pm.expect(pm.response.json().data.booking.status).to.eql('CANCELLED');`] }),
      req('Cancel again (409)', 'POST', '/bookings/{{bookingId}}/cancel', { auth: 'token', tests: [ok(409)] }),
    ] },
    { name: '5. Admin', item: [
      req('Admin login', 'POST', '/auth/login', { body: { email: '{{adminEmail}}', password: '{{adminPassword}}' }, tests: [ok(), json, `pm.collectionVariables.set('adminToken', j.data.token);`] }),
      req('User token on admin route (403)', 'GET', '/admin/stats', { auth: 'token', tests: [ok(403)] }),
      req('Stats', 'GET', '/admin/stats', { auth: 'adminToken', tests: [ok()] }),
      req('Bookings', 'GET', '/admin/bookings?status=CONFIRMED', { auth: 'adminToken', tests: [ok()] }),
      req('Create station', 'POST', '/admin/stations', { auth: 'adminToken', body: { code: 'TST', name: 'Test Junction', city: 'Testville', state: 'Test' }, tests: [`pm.expect([201, 409]).to.include(pm.response.code);`] }),
      req('List trains', 'GET', '/admin/trains', { auth: 'adminToken', tests: [ok()] }),
      req('List schedules', 'GET', '/admin/schedules', { auth: 'adminToken', tests: [ok()] }),
      req('Inventory', 'GET', '/admin/inventory?date={{date}}', { auth: 'adminToken', tests: [ok()] }),
    ] },
  ],
};
fs.writeFileSync(__dirname + '/RailBook.postman_collection.json', JSON.stringify(collection, null, 2));
console.log('wrote postman/RailBook.postman_collection.json');

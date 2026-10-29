'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

before(h.setup);
after(h.teardown);

test('registers a user, hashes the password, never returns it', async () => {
  const res = await h.api().post('/api/auth/register').send({ name: 'Asha Rao', email: 'Asha@Example.com', password: 'Secret123' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.user.email, 'asha@example.com'); // normalised
  assert.equal(res.body.data.user.role, 'USER');
  assert.ok(res.body.data.token);
  assert.equal(JSON.stringify(res.body).includes('Secret123'), false);
  assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);
  const stored = await h.mongoose.model('User').findOne({ email: 'asha@example.com' }).select('+passwordHash');
  assert.match(stored.passwordHash, /^\$2[aby]\$/); // bcrypt
  assert.notEqual(stored.passwordHash, 'Secret123');
});

test('cannot self-assign ADMIN role at registration (mass assignment)', async () => {
  const res = await h.api().post('/api/auth/register').send({ name: 'Mallory', email: 'mallory@example.com', password: 'Secret123', role: 'ADMIN' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.user.role, 'USER');
});

test('rejects duplicate email, weak password, bad email', async () => {
  await h.api().post('/api/auth/register').send({ name: 'Dup', email: 'dup@example.com', password: 'Secret123' });
  const dup = await h.api().post('/api/auth/register').send({ name: 'Dup', email: 'DUP@example.com', password: 'Secret123' });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'EMAIL_TAKEN');
  const weak = await h.api().post('/api/auth/register').send({ name: 'Weak', email: 'weak@example.com', password: 'short' });
  assert.equal(weak.status, 400);
  assert.equal(weak.body.error.code, 'VALIDATION_ERROR');
  const bad = await h.api().post('/api/auth/register').send({ name: 'Bad', email: 'nope', password: 'Secret123' });
  assert.equal(bad.status, 400);
});

test('login succeeds with correct credentials and /me works with the token', async () => {
  const u = await h.registerUser();
  const login = await h.api().post('/api/auth/login').send({ email: u.email, password: u.password });
  assert.equal(login.status, 200);
  const me = await h.api().get('/api/auth/me').set({ Authorization: `Bearer ${login.body.data.token}` });
  assert.equal(me.status, 200);
  assert.equal(me.body.data.user.email, u.email);
});

test('invalid credentials give an identical generic error (no user enumeration)', async () => {
  const u = await h.registerUser();
  const wrongPw = await h.api().post('/api/auth/login').send({ email: u.email, password: 'WrongPass1' });
  const noUser = await h.api().post('/api/auth/login').send({ email: 'ghost@example.com', password: 'WrongPass1' });
  assert.equal(wrongPw.status, 401);
  assert.equal(noUser.status, 401);
  assert.deepEqual(wrongPw.body, noUser.body);
  assert.equal(wrongPw.body.error.code, 'INVALID_CREDENTIALS');
});

test('NoSQL operator injection in login is rejected', async () => {
  const res = await h.api().post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
  assert.equal(res.status, 400);
});

test('protected routes require a valid token', async () => {
  assert.equal((await h.api().get('/api/auth/me')).status, 401);
  assert.equal((await h.api().get('/api/auth/me').set({ Authorization: 'Bearer garbage' })).status, 401);
  assert.equal((await h.api().get('/api/bookings/my-bookings')).status, 401);
});

test('profile update changes name and requires current password for a new one', async () => {
  const u = await h.registerUser();
  const ok = await h.api().patch('/api/users/me').set(u.auth).send({ name: 'New Name', phone: '9876543210' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.user.name, 'New Name');
  const noCurrent = await h.api().patch('/api/users/me').set(u.auth).send({ newPassword: 'Another123' });
  assert.equal(noCurrent.status, 400);
  const wrong = await h.api().patch('/api/users/me').set(u.auth).send({ currentPassword: 'Nope12345', newPassword: 'Another123' });
  assert.equal(wrong.status, 400);
  const good = await h.api().patch('/api/users/me').set(u.auth).send({ currentPassword: u.password, newPassword: 'Another123' });
  assert.equal(good.status, 200);
  const login = await h.api().post('/api/auth/login').send({ email: u.email, password: 'Another123' });
  assert.equal(login.status, 200);
});

test('unknown routes and malformed JSON use the standard error envelope', async () => {
  const nf = await h.api().get('/api/nothing-here');
  assert.equal(nf.status, 404);
  assert.equal(nf.body.success, false);
  const bad = await h.api().post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json');
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'INVALID_JSON');
});

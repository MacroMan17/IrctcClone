const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'railbook_token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } },
};

export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
}

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  }
  if (raw && res.ok) return res;
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON error */ }
  if (!res.ok || json?.success === false) {
    const e = json?.error || {};
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, e.code || 'ERROR', e.message || 'Something went wrong', e.details || []);
  }
  return json.data;
}

const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString();

export const api = {
  // auth & profile
  register: (b) => request('/api/auth/register', { method: 'POST', body: b }),
  login: (b) => request('/api/auth/login', { method: 'POST', body: b }),
  me: () => request('/api/auth/me'),
  updateProfile: (b) => request('/api/users/me', { method: 'PATCH', body: b }),
  // catalog
  stations: (q = '') => request(`/api/stations?${qs({ q })}`),
  search: (p) => request(`/api/trains/search?${qs(p)}`),
  train: (id, p = {}) => request(`/api/trains/${id}?${qs(p)}`),
  // bookings
  createBooking: (b, key) => request('/api/bookings', { method: 'POST', body: b, headers: key ? { 'Idempotency-Key': key } : {} }),
  myBookings: (p = {}) => request(`/api/bookings/my-bookings?${qs(p)}`),
  booking: (id) => request(`/api/bookings/${id}`),
  pnr: (pnr) => request(`/api/bookings/pnr/${pnr}`),
  refundPreview: (id) => request(`/api/bookings/${id}/refund-preview`),
  cancel: (id) => request(`/api/bookings/${id}/cancel`, { method: 'POST' }),
  // payments (mock)
  initiatePayment: (bookingId) => request('/api/payments/mock-initiate', { method: 'POST', body: { bookingId } }),
  confirmPayment: (paymentId, outcome) => request('/api/payments/mock-confirm', { method: 'POST', body: { paymentId, outcome } }),
  // tickets
  verifyTicket: (token) => request(`/api/tickets/verify/${token}`),
  async downloadTicket(id, pnr) {
    const res = await request(`/api/bookings/${id}/ticket.pdf`, { raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ticket-${pnr || id}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
  // admin
  admin: {
    stats: () => request('/api/admin/stats'),
    bookings: (p = {}) => request(`/api/admin/bookings?${qs(p)}`),
    trains: () => request('/api/admin/trains'),
    createTrain: (b) => request('/api/admin/trains', { method: 'POST', body: b }),
    updateTrain: (id, b) => request(`/api/admin/trains/${id}`, { method: 'PATCH', body: b }),
    deleteTrain: (id) => request(`/api/admin/trains/${id}`, { method: 'DELETE' }),
    createStation: (b) => request('/api/admin/stations', { method: 'POST', body: b }),
    updateStation: (id, b) => request(`/api/admin/stations/${id}`, { method: 'PATCH', body: b }),
    deleteStation: (id) => request(`/api/admin/stations/${id}`, { method: 'DELETE' }),
    schedules: () => request('/api/admin/schedules'),
    createSchedule: (b) => request('/api/admin/schedules', { method: 'POST', body: b }),
    updateSchedule: (id, b) => request(`/api/admin/schedules/${id}`, { method: 'PATCH', body: b }),
    deleteSchedule: (id) => request(`/api/admin/schedules/${id}`, { method: 'DELETE' }),
    inventory: (p = {}) => request(`/api/admin/inventory?${qs(p)}`),
    generateInventory: (b) => request('/api/admin/inventory/generate', { method: 'POST', body: b }),
    deleteInventory: (id) => request(`/api/admin/inventory/${id}`, { method: 'DELETE' }),
  },
};

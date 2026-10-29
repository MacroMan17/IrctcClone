const IST = 'Asia/Kolkata';
export const fmtTime = (iso) => new Intl.DateTimeFormat('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
export const fmtDateTime = (iso) => new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
export const fmtDateShort = (iso) => new Intl.DateTimeFormat('en-IN', { timeZone: IST, weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(iso));
export const fmtDateKey = (key) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${key}T00:00:00Z`));
export const rupees = (n) => `\u20B9${Number(n).toLocaleString('en-IN')}`;
export const duration = (min) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
export const CLASS_NAMES = { SL: 'Sleeper', '3A': 'AC 3 Tier', '2A': 'AC 2 Tier', '1A': 'AC First', CC: 'AC Chair Car', '2S': 'Second Sitting' };

/** Local calendar date as YYYY-MM-DD (for <input type="date">), offset by n days. */
export function localDateKey(offsetDays = 0) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

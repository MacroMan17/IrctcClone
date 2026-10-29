# 1. Requirements

RailBook is an independent educational IRCTC-inspired reservation system. It uses seeded sample data and does **not** use IRCTC APIs or make real reservations.

## Functional
| Area | Requirement |
|---|---|
| Auth | Register, login, `/me`, profile update (name, phone, password change); roles `USER` and `ADMIN` |
| Search | Source, destination, date; train number/name, times, duration, classes, availability, fares; filters (class, departure window) and sorting (departure, duration, price) |
| Booking | Choose train/class/passengers (1-6), server-side fare, seat hold, mock payment, unique 10-digit PNR, confirmation only after commit |
| Tickets | PDF e-ticket generated from the **saved** booking, with QR (opaque verification token) |
| PNR / history | Public PNR lookup (masked), authenticated booking history (all/upcoming/past) |
| Cancellation | Eligibility rules, refund preview, configurable refund tiers, idempotent, inventory restored |
| Admin | Stations, trains, schedules, class-wise inventory CRUD; booking list and statistics |

## Non-functional
- **Security:** JWT (HS256) + bcrypt, Helmet, CORS allow-list, rate limiting, Zod validation, NoSQL-operator stripping, no hard-coded secrets (`.env.example`).
- **Correctness:** no overselling or duplicate seats under concurrency; idempotent payment confirmation, cancellation and booking creation.
- **Performance:** indexes on every lookup path (see 04-database-design.md).
- **Operability:** uniform error envelope, structured logging (pino, with secret redaction), health endpoint, graceful shutdown.
- **UX:** responsive, accessible (labels, ARIA combobox, focus rings, reduced-motion), loading/empty/error states.

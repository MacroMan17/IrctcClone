# 10. Roadmap and Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Requirements, HLD/LLD, schema, API spec | Done (docs 01-09) |
| 2 | Project setup, env validation, Mongo connection, logging, errors, health | Done |
| 3 | Auth + authorization + profile | Done (`auth.test.js`) |
| 4 | Stations, trains, schedules, inventory, seed data | Done (`seeds/`) |
| 5 | Search API + UI (filters, sorting) | Done (`search.test.js`) |
| 6 | Atomic hold, mock payment, expiry sweeper | Done (`booking.test.js`) |
| 7 | PNR, history, PDF + QR | Done (`ticket.test.js`) |
| 8 | Cancellation, refund simulation, admin dashboard | Done (`cancel.test.js`, `admin.test.js`) |
| 9 | Test suite, security review, error handling | Done, 63 tests |
| 10 | Deployment docs, README, Postman, limitations | Done |

Future: Redis search cache, queue-driven emails/expiry events, segment-wise seat reuse, waitlist/RAC, real gateway with signed webhooks, httpOnly cookie auth, i18n.

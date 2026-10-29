# 12. Testing

```bash
cd backend
# needs a MongoDB REPLICA SET (transactions). Default test DB: irctc_clone_test
TEST_MONGO_URI="mongodb://127.0.0.1:27017/irctc_clone_test?replicaSet=rs0" npm test
```
63 integration tests (Node's built-in runner + supertest, real MongoDB, no mocks of the database).

| Requirement | Test file / case |
|---|---|
| Registration, login, invalid credentials | `auth.test.js` (enumeration-safe errors, mass-assignment, NoSQL injection) |
| Search valid / invalid station combos | `search.test.js` (same station, unknown, wrong direction, bad/past/far dates, running days, filters, sorting) |
| No available seats | `booking.test.js` sold-out + partial availability |
| **Concurrent bookings, same inventory** | 20 requests / 4 seats -> exactly 4 succeed; multi-passenger variant; no duplicate seats |
| Payment failure and retry | failure keeps hold; retry succeeds; failed payment cannot be flipped to success |
| **Duplicate payment callbacks** | sequential and 6 concurrent confirms -> one PNR, seats booked once |
| PNR uniqueness | 25 bookings unique; forced collision retried |
| PDF generation and download authorization | `ticket.test.js` (valid PDF, DB-derived, one page, 401/403/404/409, QR token verification) |
| Cancellation + duplicate cancellation | `cancel.test.js` (refund tiers, config override, 6 concurrent cancels -> 1 wins, atomic rollback on injected failure) |
| Inventory restoration | after cancellation, failed payment expiry, orphaned hold sweep |
| Unauthorized access to another user's booking | read, pay, confirm, cancel -> 403; anonymous -> 401 |
| Admin-only operations | `admin.test.js` (401/403 matrix, CRUD, protections, stats) |

Live check against a running server: `npm run seed && npm start` then `node scripts/smoke.js` (register -> search -> hold -> failed payment -> retry -> PNR -> PDF -> cancel -> duplicate cancel).

# 8. Error Handling

Every error uses one envelope:
```json
{ "success": false, "error": { "code": "SEATS_UNAVAILABLE", "message": "Only 2 seat(s) left in this class", "details": [] } }
```
| Status | Codes |
|---|---|
| 400 | `VALIDATION_ERROR` (with `details[{path,message}]`), `INVALID_JSON`, `WRONG_PASSWORD` |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND`, `ROUTE_NOT_FOUND`, `STATION_NOT_FOUND`, `TRAIN_NOT_FOUND`, `BOOKING_NOT_FOUND`, `PNR_NOT_FOUND`, `NO_SERVICE`, `TICKET_NOT_FOUND`, `PAYMENT_NOT_FOUND` |
| 409 | `SEATS_UNAVAILABLE`, `BOOKING_CLOSED`, `TOO_MANY_HOLDS`, `EMAIL_TAKEN`, `ALREADY_CANCELLED`, `NOT_CANCELLABLE`, `TRAIN_DEPARTED`, `BOOKING_NOT_PAYABLE`, `PAYMENT_ALREADY_FAILED`, `PAYMENT_STATE_INVALID`, `TICKET_NOT_AVAILABLE`, `INVENTORY_IN_USE`, `TRAIN_HAS_BOOKINGS`, `SCHEDULE_HAS_BOOKINGS`, `STATION_IN_USE`, `*_EXISTS` |
| 410 | `HOLD_EXPIRED` |
| 413 / 429 | `PAYLOAD_TOO_LARGE` / `RATE_LIMITED` |
| 500 | `INTERNAL` (details never leaked; logged with pino) |

Transactions run through `mongoose.connection.transaction()`, which retries `TransientTransactionError`s automatically; throwing inside the callback aborts the whole transaction (tested by injecting a failure mid-cancellation).

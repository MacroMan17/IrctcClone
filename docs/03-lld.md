# 3. Low-Level Design

## Backend layout
```
backend/src
  app.js server.js
  config/      env.js (Zod-validated), db.js, logger.js, constants.js (statuses + legal transitions)
  middleware/  auth.js authorize validate sanitize rateLimit errorHandler
  utils/       ApiError pnr dates money pagination
  jobs/        holdSweeper.js
  modules/<name>/  model | validator (Zod) | service | controller | routes
```

## Responsibilities
| Module | Responsibility |
|---|---|
| auth, users | Register/login, JWT, profile. Role is never read from input |
| stations | Station master data + autocomplete search |
| trains | Train master (classes, fares, coach layout); search + detail service |
| schedules | Route stops, running days, `resolveJourney` (times, distance), `computeFare` |
| inventory | `ensureInventory`, `holdSeats`, `confirmSeats`, `releaseSeats` (all atomic) |
| bookings | Orchestrates lifecycle: create-hold, finalize (txn), cancel (txn), PNR, history |
| payments | Mock gateway: initiate (idempotent), confirm (idempotent, server decides) |
| tickets | PDF + QR from the saved booking, public token verification |
| admin | CRUD wrappers, inventory generation, booking list, stats aggregation |

## Request pipeline
`pino-http` -> `helmet` -> `cors` -> `json(10kb)` -> `sanitize` -> `rateLimit` -> route -> `authenticate` -> `authorize` -> `validate(zod)` -> controller -> service -> `errorHandler`.

## Key algorithms
- **Journey resolution:** `runDate = journeyDate - fromStop.dayOffset`; the train must run on `runDate`'s weekday; `departureAt`/`arrivalAt` computed in IST. Inventory is keyed by `runDate`, so a passenger boarding at an intermediate station after midnight books the correct run.
- **Fare:** `perPassenger = round(baseFarePerKm * km) + reservationCharge`; `GST = round(GST% * (base + reservation))`; always computed server-side from the saved train definition.
- **Refund:** tier table `REFUND_TIERS=48:90,12:75,4:50` (hours-before:percent); below the last tier is 0%.

# 9. REST API Specification

Base URL: `http://localhost:5000/api`. All responses: `{ "success": true, "data": ... }` or the error envelope (see 08). Auth = `Authorization: Bearer <jwt>`.

Legend: **Public** no auth, **User** any logged-in user, **Owner** the booking/payment owner (admins may read), **Admin** role ADMIN.

## Health
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | Public | `503` if MongoDB is down |

## Auth and profile
| Method | Path | Auth | Body / notes |
|---|---|---|---|
| POST | `/auth/register` | Public | `{name, email, password, phone?}` -> `201 {user, token}` |
| POST | `/auth/login` | Public | `{email, password}` -> `{user, token}` |
| GET | `/auth/me` | User | `{user}` |
| PATCH | `/users/me` | User | `{name?, phone?, currentPassword?, newPassword?}` |

## Catalog and search
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/stations?q=` | Public | autocomplete by code/name/city |
| GET | `/trains/search?from&to&date&class&departAfter&departBefore&sort&order` | Public | `date=YYYY-MM-DD`; `sort=departure|duration|price` |
| GET | `/trains/:id?from&to&date` | Public | route, running days, per-class availability and fare for the journey |

```json
// GET /trains/search?from=NDLS&to=HWH&date=2026-10-25&sort=price
{ "success": true, "data": { "count": 1, "trains": [ {
  "scheduleId": "...", "trainId": "...", "number": "90003", "name": "Howrah Mail", "runDate": "2026-10-25",
  "from": { "code": "NDLS", "departure": "17:05" }, "to": { "code": "HWH", "arrival": "10:10" },
  "durationMinutes": 1025, "distanceKm": 1450, "bookable": true,
  "classes": [ { "code": "3A", "available": 192, "totalSeats": 192, "fare": 2795, "status": "AVAILABLE" } ] } ] } }
```

## Bookings
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/bookings` | User | Hold seats. Header `Idempotency-Key` (8-80 chars, optional but recommended). Body `{scheduleId, from, to, date, classCode, passengers:[{name, age, gender M/F/O}]}` (1-6). `201` new, `200` replay |
| GET | `/bookings/my-bookings?scope=all|upcoming|past&page&limit` | User | |
| GET | `/bookings/:id` | Owner | full detail; seats visible once confirmed |
| GET | `/bookings/pnr/:pnr` | Public | masked names, no fare |
| GET | `/bookings/:id/refund-preview` | Owner | `{cancellable, refundPercent, refundAmount, tiers}` |
| POST | `/bookings/:id/cancel` | Owner | `{booking{status:CANCELLED, cancellation}}` |

```json
// POST /bookings  -> 201
{ "success": true, "data": { "replayed": false, "booking": {
  "id": "...", "pnr": null, "status": "PENDING_PAYMENT", "classCode": "3A",
  "fare": { "base": 5510, "reservationCharge": 80, "gst": 280, "total": 5870 },
  "holdExpiresAt": "2026-10-23T11:25:00.000Z",
  "passengers": [ { "name": "Asha Rao", "age": 34, "gender": "F", "coach": null, "seat": null } ] } } }
```

## Payments (mock)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/payments/mock-initiate` | Owner | `{bookingId}`; amount comes from the booking; idempotent while a payment is in flight |
| POST | `/payments/mock-confirm` | Owner | `{paymentId, outcome?: SUCCESS|FAILURE}`; outcome honoured only if `MOCK_PAYMENT_ALLOW_CLIENT_OUTCOME=true`, otherwise simulated server-side. Duplicate callbacks return `replayed:true` |

## Tickets
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/bookings/:id/ticket.pdf` | Owner | PDF download (CONFIRMED or CANCELLED) |
| GET | `/bookings/:id/ticket-verification?token=` | Public | id + token must match |
| GET | `/tickets/verify/:token` | Public | target of the QR code |

## Admin (all require role ADMIN)
| Method | Path | Notes |
|---|---|---|
| POST / PATCH / DELETE | `/admin/stations[/:id]` | delete blocked if used by a schedule |
| GET / POST / PATCH / DELETE | `/admin/trains[/:id]` | class layout change blocked while seats are held/booked; delete blocked with live bookings |
| GET / POST / PATCH / DELETE | `/admin/schedules[/:id]` | `{trainId, runningDays, stops:[{stationCode, arrival?, departure?, dayOffset, distanceKm}]}` |
| GET | `/admin/inventory?scheduleId&date&page&limit` | seat counts per run/class |
| POST | `/admin/inventory/generate` | `{scheduleId, from, to}` (max 60 days) |
| DELETE | `/admin/inventory/:id` | only if no held/booked seats |
| GET | `/admin/bookings?status&pnr&page&limit` | |
| GET | `/admin/stats` | totals, revenue, last 7 days, top trains |

## Deviations from the original endpoint list
- Added `GET /bookings/:id/refund-preview`, `GET /tickets/verify/:token` and the admin inventory/schedule endpoints.
- `Idempotency-Key` header added to `POST /bookings`.
- The QR points to `/verify/:token` in the SPA rather than a raw booking id.

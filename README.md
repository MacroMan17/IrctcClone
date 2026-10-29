# RailBook - IRCTC-inspired Railway Reservation System

A full-stack educational railway ticket booking app: search trains, hold seats, mock-pay, get a unique PNR, download a PDF e-ticket, cancel with a refund, and manage everything from an admin dashboard.

> Independent educational project. Not affiliated with IRCTC or Indian Railways. It uses fictional sample data, makes no real reservations and uses a **mock** payment flow.

**Stack:** React 19 + Vite + Tailwind 4 | Node 18+ / Express 5 | MongoDB + Mongoose 9 | JWT + bcrypt | PDFKit + qrcode | Zod | pino | Node test runner + supertest

## What is verified
- **63 backend integration tests pass** against a real MongoDB replica set, including concurrent booking (20 requests for 4 seats -> exactly 4 succeed), duplicate payment callbacks, duplicate/concurrent cancellation, atomic rollback, hold expiry, orphaned-hold recovery and authorization.
- **Live smoke test** (`backend/scripts/smoke.js`) and the **Postman collection** (30 requests / 30 assertions, run with Newman) pass against a running server.
- **UI flow driven in headless Chromium:** search -> login -> passengers -> failed payment -> retry -> confirmation -> PDF download -> PNR page -> cancel -> mobile layout -> admin dashboard.
- Not verified here: deployment to a hosting provider and `docker-compose.yml` (written, not run).

## Quick start

**1. MongoDB replica set** (transactions need one). Easiest: Docker, or a free Atlas cluster.
```bash
docker compose up -d          # local single-node replica set on :27017
```

**2. Backend**
```bash
cd backend
cp .env.example .env          # set JWT_SECRET (>=32 chars), MONGO_URI, ADMIN_EMAIL/ADMIN_PASSWORD
npm install
npm run seed                  # 18 stations, 11 trains, 2 weeks of inventory, admin + demo user
npm run dev                   # http://localhost:5000  (GET /api/health)
```

**3. Frontend**
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173  (proxies /api to :5000)
```

Log in with the `ADMIN_EMAIL` / `DEMO_USER_EMAIL` accounts you set in `.env` (the seed script reads them; nothing is hard-coded). Try NDLS -> HWH, or NDLS -> BCT.

**4. Tests**
```bash
cd backend
npm test                      # needs the replica set; override DB with TEST_MONGO_URI
node scripts/smoke.js         # with the server running and seeded
npx newman run ../postman/RailBook.postman_collection.json --env-var adminPassword=<your admin password>
```

## Repository layout
```
backend/   Express API (modules: auth users stations trains schedules inventory bookings payments tickets admin)
frontend/  React SPA (search, booking, payment, tickets, PNR, dashboard, admin)
docs/      01 requirements | 02 HLD | 03 LLD | 04 DB design | 05 booking/concurrency | 06 security | 07 PDF flow
           08 errors | 09 API spec | 10 status | 11 deployment | 12 testing | 13 limitations
postman/   Collection (+ build.js generator)
docker-compose.yml
```

## How correctness is guaranteed (short version)
- Seats live in one inventory document per train-run and class; a **single atomic update** (`availableCount >= n`) hands out seats, so overselling is impossible.
- Booking confirm and cancel run in **transactions**; every state change is a guarded update, and payment confirm / cancel / create are **idempotent**.
- Fare, status, PNR and seat numbers are always computed server-side; the PDF is rendered from the saved booking.
- A sweeper expires stale holds and recovers orphaned ones.

Details: `docs/05-booking-flow.md`, `docs/06-auth-and-security.md`, `docs/13-known-limitations.md`.

## Configuration
All settings are environment variables validated at boot (`backend/src/config/env.js`, documented in `backend/.env.example`): hold duration, refund tiers (`REFUND_TIERS=48:90,12:75,4:50`), GST, booking cut-off, rate limits, mock payment behaviour.

## License
MIT - for learning and portfolio use.

# RailBook - Setup & Installation Guide

A full-stack educational railway ticket booking application. Search trains, hold seats, mock-pay, get a unique PNR, download a PDF e-ticket, cancel with a refund, and manage everything from an admin dashboard.

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js** 18+ (https://nodejs.org/)
- **MongoDB** Community Edition (https://www.mongodb.com/try/download/community)
- **Git** (https://git-scm.com/)

### Step 1: Clone the Repository

```bash
git clone https://github.com/MacroMan17/IrctcClone.git
cd IrctcClone
```

### Step 2: Setup MongoDB

**Option A: Docker (Easiest)**
```bash
docker compose up -d
```

**Option B: Local MongoDB Installation**

1. Install MongoDB Community Edition from https://www.mongodb.com/try/download/community
2. During installation, ensure **"Install as a Service"** is checked
3. Update MongoDB config to enable replica set:
   - Find: `C:\Program Files\MongoDB\Server\[VERSION]\bin\mongod.cfg`
   - Add under `replication:`:
     ```yaml
     replication:
       replSetName: rs0
     ```
4. Restart MongoDB service:
   ```powershell
   Restart-Service -Name MongoDB
   ```

### Step 3: Setup Backend

```bash
cd backend

# Copy environment template and configure
cp .env.example .env

# Install dependencies
npm install

# Seed database (creates 18 stations, 11 trains, demo users)
npm run seed

# Start development server
npm run dev
```

Backend will run on **http://localhost:5000**

**Environment Variables (`.env`):**
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: Admin login credentials
- `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD`: Demo login credentials

### Step 4: Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on **http://localhost:5173**

---

## Access the Application

1. **Open:** http://localhost:5173 in your browser
2. **Login with:**
   - **Email:** `admin@example.com`
   - **Password:** `change-this-admin-password`

   OR

   - **Email:** `demo@example.com`
   - **Password:** `change-this-demo-password`

3. **Try it out:**
   - Search trains (e.g., NDLS → HWH)
   - Select and book tickets
   - Process mock payment
   - Download PDF e-ticket
   - View PNR details
   - Cancel booking and get refund
   - Access admin dashboard

---

## Deployment

### Frontend Deployment (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy the 'dist' folder to Vercel/Netlify
```

Update `VITE_API_URL` environment variable to point to your backend.

### Backend Deployment

1. Use MongoDB Atlas (free cloud cluster) instead of local MongoDB
2. Deploy to platforms like:
   - **Render.com** (free tier available)
   - **Railway.app**
   - **Heroku** (paid)
   - **AWS/Google Cloud/Azure**

Update `MONGO_URI` to your MongoDB Atlas connection string.

See `docs/11-deployment.md` for detailed deployment instructions.

---

## Testing

### Run Backend Tests
```bash
cd backend
npm test                      # runs all tests
node scripts/smoke.js         # runs smoke tests with live server
npx newman run ../postman/RailBook.postman_collection.json
```

### What's Tested
- ✅ 63 backend integration tests
- ✅ Concurrent booking (20 requests for 4 seats → exactly 4 succeed)
- ✅ Payment idempotency
- ✅ Cancellation with atomic rollback
- ✅ Hold expiry and recovery
- ✅ Authorization checks

---

## Project Structure

```
backend/
  ├── src/
  │   ├── config/          # Database, environment, logger
  │   ├── modules/         # Auth, Booking, Payment, Tickets, etc.
  │   ├── middleware/      # Authentication, rate limiting, validation
  │   ├── jobs/            # Background jobs (hold sweeper)
  │   └── utils/           # Helpers, error handling
  ├── tests/               # Integration tests
  ├── seeds/               # Database seeding
  └── package.json

frontend/
  ├── src/
  │   ├── pages/           # Search, Booking, Payment, Dashboard
  │   ├── components/      # Reusable UI components
  │   ├── api/             # API client
  │   └── context/         # Auth state management
  ├── index.html
  └── package.json

docs/
  ├── 01-requirements.md   # Feature requirements
  ├── 02-hld.md            # High-level design
  ├── 03-lld.md            # Low-level design
  ├── 04-database-design.md # Schema and indexing
  ├── 05-booking-flow.md   # Booking logic and concurrency
  ├── 06-auth-and-security.md # Security measures
  ├── 09-api-spec.md       # API endpoints
  ├── 11-deployment.md     # Production deployment guide
  └── 12-testing.md        # Test strategy
```

---

## Stack

**Frontend:**
- React 19 + Vite
- Tailwind CSS 4
- React Router 7

**Backend:**
- Node.js 18+ / Express 5
- MongoDB 9 + Mongoose
- JWT + bcrypt (authentication)
- PDFKit + QRCode (e-tickets)

**Database:**
- MongoDB (transactions require replica set)
- Atomic operations for inventory
- TTL indexes for hold expiry

---

## Key Features

- **Atomic Seat Allocation:** Single document update prevents overselling
- **Transactions:** Booking confirm/cancel run in transactions with rollback
- **Idempotent APIs:** Payment operations are idempotent
- **Hold Expiry:** Automatic sweeper recovers stale holds
- **PDF Generation:** Server-side rendering with QR code
- **Rate Limiting:** 100 requests/min per IP
- **Input Validation:** Zod schema validation
- **Error Handling:** Comprehensive error codes and messages

---

## Known Limitations

- Single-node replica set (not suitable for production; use MongoDB Atlas)
- Mock payment system (not real transactions)
- No user email verification
- No SMS OTP integration
- Limited to fictional train data

See `docs/13-known-limitations.md` for more details.

---

## License

MIT - For learning and portfolio use

---

## Support

- Check `docs/` folder for detailed documentation
- Review `backend/tests/` for code examples
- Postman collection: `postman/RailBook.postman_collection.json`

---

**Happy coding! 🚂✨**

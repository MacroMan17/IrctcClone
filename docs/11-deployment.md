# 11. Deployment

## Database: MongoDB Atlas (replica set included)
1. Create a free cluster, a database user, and allow your API host's IP (or `0.0.0.0/0` for demos).
2. Copy the SRV connection string into `MONGO_URI` (e.g. `mongodb+srv://USER:PASS@cluster.mongodb.net/irctc_clone?retryWrites=true&w=majority`).

## Backend (Render / Railway / Fly.io / any Node host)
- Root directory `backend`, build `npm ci --omit=dev`, start `npm start`, Node >= 18.
- Environment variables (see `backend/.env.example`): `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (>=32 random chars), `CORS_ORIGIN=https://<your-frontend>`, `APP_BASE_URL=https://<your-frontend>`, plus optional tuning. Set `MOCK_PAYMENT_ALLOW_CLIENT_OUTCOME=false` for a public demo.
- Seed once from a shell with the env set: `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed`.
- Health check path: `/api/health`.
- Run a **single** instance, or move the hold sweeper to a dedicated worker (`RUN_HOLD_SWEEPER=false` on web instances). The sweeper is idempotent, so duplicate runs are safe but wasteful.

## Frontend (Vercel / Netlify / any static host)
- Root `frontend`, build `npm run build`, output `dist`.
- Set `VITE_API_URL=https://<your-api-host>` at build time.
- Add an SPA fallback rewrite to `/index.html` (Netlify `_redirects`: `/* /index.html 200`; Vercel `rewrites`).
- Alternative: serve `dist` from Nginx and proxy `/api` to the Node server (same origin, no CORS needed).

## Production checklist
- [ ] Strong unique `JWT_SECRET`; HTTPS only; CORS restricted
- [ ] `BCRYPT_ROUNDS` >= 12; admin password rotated after seeding
- [ ] Atlas backups enabled; IP allow-list tightened
- [ ] Log shipping/alerts on 5xx; uptime check on `/api/health`
- [ ] Mock payment outcome control disabled

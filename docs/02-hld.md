# 2. High-Level Design

```mermaid
flowchart LR
  subgraph Client
    UI[React + Vite + Tailwind SPA]
  end
  subgraph API["Express API - modular monolith"]
    MW[helmet, cors, rate-limit, sanitize, auth, validate, errorHandler]
    AUTH[auth / users]
    CAT[stations / trains / schedules]
    INV[inventory - only module that mutates seats]
    BK[bookings]
    PAY[payments - mock]
    TK[tickets - PDFKit + QR]
    ADM[admin]
    JOB[hold sweeper job]
  end
  DB[(MongoDB replica set)]
  REDIS[(Redis - future: search cache)]
  MQ[[RabbitMQ / Kafka - future: emails, expiry events]]
  UI -- HTTPS REST + JWT --> MW
  MW --> AUTH & CAT & BK & PAY & TK & ADM
  BK --> INV
  PAY --> BK
  TK --> BK
  AUTH & CAT & INV & BK & PAY & ADM --> DB
  JOB --> INV
  CAT -. later .-> REDIS
  BK -. later .-> MQ
```

**Module rule:** a module calls another module's *service*, never its models (exceptions: read-only existence checks). `inventory.service` is the single writer of seat state, so Redis caching, a queue, or extracting a service later only touches one seam.

## Deployment architecture
```mermaid
flowchart LR
  U[Browser] --> FE[Static host: Vercel / Netlify / S3+CDN - React build]
  U -->|/api| API[Node API: Render / Railway / Fly / EC2]
  API --> ATLAS[(MongoDB Atlas replica set)]
  API -. optional .-> R[(Redis)]
```
HTTPS everywhere; CORS restricted to the frontend origin; secrets only in host environment variables. See `11-deployment.md`.

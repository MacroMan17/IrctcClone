# 13. Known Limitations and Future Improvements

**Limitations**
1. **Whole-journey seat blocking:** a seat is held for the train's full run; no segment-wise reuse (e.g. NDLS-CNB then CNB-HWH on the same seat).
2. **No waitlist/RAC, quotas, Tatkal, berth preference, or child/senior fare rules.**
3. **Mock payment only.** The client reports the simulated outcome when `MOCK_PAYMENT_ALLOW_CLIENT_OUTCOME=true`; a real integration must confirm via a signed gateway webhook and reconcile.
4. **Transactions need a replica set;** a standalone `mongod` cannot confirm/cancel.
5. **In-process hold sweeper:** run on one instance or a worker; hold-expiry latency is up to `HOLD_SWEEP_SECONDS`.
6. **Seat arrays in one document** (<= ~1,100 seats per class/run) keep holds atomic but cap coach size; very large classes would need sharding by coach.
7. **JWT in localStorage** (XSS exposure) and no refresh/revocation; no email verification or password reset.
8. **Rate limiting is per-process memory;** use a shared store (Redis) with multiple instances.
9. **Refund is simulated** (a record, no money movement); no partial-passenger cancellation.
10. **Single schedule per train**, fixed weekday pattern (no special/cancelled runs).
11. Sample timetable data is fictional.

**Future improvements:** Redis cache for search + rate limits, queue (RabbitMQ/Kafka) for email/SMS and expiry events, segment inventory, waitlist, real gateway, httpOnly cookie auth + refresh tokens, audit log, OpenAPI generation, Playwright CI suite, Dockerfiles/compose.

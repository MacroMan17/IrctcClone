# 7. PDF E-Ticket Flow

1. `GET /api/bookings/:id/ticket.pdf` -> `authenticate` -> ownership check (403 otherwise).
2. `ticket.service.loadTicketBooking` loads the booking **from MongoDB** (never from the request); only `CONFIRMED`/`CANCELLED` bookings with a PNR qualify (`409 TICKET_NOT_AVAILABLE` otherwise).
3. QR = `${APP_BASE_URL}/verify/<verificationToken>` generated with `qrcode`.
4. PDFKit renders one A4 page: header with logo placeholder, PNR, status, train, stations, IST times, journey date, class, passengers with coach/seat, fare breakdown, QR, booking time, disclaimer (and a CANCELLED watermark + refund line when applicable).
5. Response: `application/pdf`, `Content-Disposition: attachment; filename="ticket-<PNR>.pdf"`, `Cache-Control: private, no-store`.
6. Verification: SPA route `/verify/:token` calls public `GET /api/tickets/verify/:token`, which returns validity, masked names and no fare. `GET /api/bookings/:id/ticket-verification?token=` is also provided and requires id and token to match.

Tests assert: valid `%PDF` bytes, DB-derived content, single page (even with 6 passengers), 401/403/404/409 cases.

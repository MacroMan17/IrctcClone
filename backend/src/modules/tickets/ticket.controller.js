'use strict';
const service = require('./ticket.service');
const bookings = require('../bookings/booking.service');

exports.download = async (req, res) => {
  await bookings.getOwned(req.user, req.valid.params.id); // 403 for other users' bookings
  const booking = await service.loadTicketBooking(req.valid.params.id);
  const pdf = await service.buildTicketPdf(booking);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="ticket-${booking.pnr}.pdf"`,
    'Content-Length': pdf.length,
    'Cache-Control': 'private, no-store',
  });
  res.send(pdf);
};

exports.verifyById = async (req, res) => {
  res.json({ success: true, data: await service.verifyByToken(req.valid.query.token, req.valid.params.id) });
};

exports.verifyByToken = async (req, res) => {
  res.json({ success: true, data: await service.verifyByToken(req.params.token) });
};

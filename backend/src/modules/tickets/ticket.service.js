'use strict';
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { APP_NAME, BOOKING_STATUS: S } = require('../../config/constants');
const { dateKey } = require('../../utils/dates');
const Booking = require('../bookings/booking.model');
const CancellationRecord = require('../bookings/cancellationRecord.model');
const { maskName } = require('../bookings/booking.dto');

const CLASS_NAMES = { SL: 'Sleeper', '3A': 'AC 3 Tier', '2A': 'AC 2 Tier', '1A': 'AC First Class', CC: 'AC Chair Car', '2S': 'Second Sitting' };
const fmtDateTime = (d) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
const fmtDate = (d) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
const rs = (n) => `Rs. ${n.toLocaleString('en-IN')}`;

const verificationUrl = (token) => `${env.APP_BASE_URL.replace(/\/$/, '')}/verify/${token}`;

/** Load the ticket's booking and make sure it is allowed to be rendered. The PDF is built ONLY from this saved record. */
async function loadTicketBooking(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found', 'BOOKING_NOT_FOUND');
  if (![S.CONFIRMED, S.CANCELLED].includes(booking.status) || !booking.pnr) {
    throw ApiError.conflict('TICKET_NOT_AVAILABLE', 'A ticket is available only for confirmed bookings');
  }
  return booking;
}

async function buildTicketPdf(booking) {
  const cancellation = booking.status === S.CANCELLED ? await CancellationRecord.findOne({ booking: booking._id }).lean() : null;
  const qr = await QRCode.toBuffer(verificationUrl(booking.verificationToken), { margin: 1, width: 220, errorCorrectionLevel: 'M' });

  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `E-Ticket ${booking.pnr}`, Author: APP_NAME, Subject: 'Educational project e-ticket (not a real railway ticket)' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });

  const INK = '#1C2128'; const BLUE = '#0F4C81'; const MUTED = '#5B6572'; const LINE = '#D5DBE3'; const GREEN = '#1B7F4B'; const RED = '#B3261E';
  const W = doc.page.width - 80; const L = 40;

  // Header with logo placeholder
  doc.rect(L, 40, W, 64).fill(BLUE);
  doc.roundedRect(L + 14, 52, 40, 40, 6).lineWidth(1.5).strokeColor('#F2A900').stroke();
  doc.fillColor('#F2A900').font('Helvetica-Bold').fontSize(8).text('LOGO', L + 14, 68, { width: 40, align: 'center' });
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(APP_NAME, L + 66, 54);
  doc.font('Helvetica').fontSize(9).text('Electronic Reservation Slip', L + 66, 79);
  doc.font('Helvetica-Bold').fontSize(9).text('EDUCATIONAL PROJECT', L, 58, { width: W - 14, align: 'right' });
  doc.font('Helvetica').fontSize(8).text('Not a real railway ticket', L, 72, { width: W - 14, align: 'right' });

  // PNR + status
  let y = 124;
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('PNR', L, y);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(26).text(booking.pnr, L, y + 12);
  const statusColor = booking.status === S.CONFIRMED ? GREEN : RED;
  doc.roundedRect(L + W - 120, y + 8, 120, 28, 4).fill(statusColor);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12).text(booking.status === S.CONFIRMED ? 'CONFIRMED' : 'CANCELLED', L + W - 120, y + 16, { width: 120, align: 'center' });

  // Train + journey
  y += 58;
  doc.moveTo(L, y).lineTo(L + W, y).strokeColor(LINE).lineWidth(1).stroke();
  y += 12;
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(14).text(`${booking.trainNumber}  ${booking.trainName}`, L, y);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(`${CLASS_NAMES[booking.classCode] || booking.classCode} (${booking.classCode})  |  ${booking.distanceKm} km`, L, y + 20);

  y += 46;
  const col = W / 2 - 80;
  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('FROM', L, y).text('TO', L + col + 160, y);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(`${booking.from.name} (${booking.from.code})`, L, y + 11, { width: col }).text(`${booking.to.name} (${booking.to.code})`, L + col + 160, y + 11, { width: col });
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('Departure', L, y + 44).text('Arrival', L + col + 160, y + 44);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(10.5).text(fmtDateTime(booking.departureAt), L, y + 56).text(fmtDateTime(booking.arrivalAt), L + col + 160, y + 56);
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(16).text('>>>', L + col + 10, y + 12, { width: 140, align: 'center' });
  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('Times in IST', L + col + 10, y + 56, { width: 140, align: 'center' });

  y += 92;
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(`Journey date: ${fmtDate(booking.journeyDate)}`, L, y);

  // Passengers table
  y += 28;
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text('Passengers', L, y);
  y += 18;
  const cols = [L, L + 30, L + 250, L + 305, L + 370, L + 440];
  doc.rect(L, y - 3, W, 18).fill('#EEF2F7');
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8.5);
  ['#', 'Name', 'Age', 'Gender', 'Coach', 'Seat'].forEach((h, i) => doc.text(h, cols[i] + 4, y + 2));
  y += 20;
  doc.font('Helvetica').fontSize(10).fillColor(INK);
  booking.passengers.forEach((p, i) => {
    doc.text(String(i + 1), cols[0] + 4, y).text(p.name, cols[1] + 4, y, { width: 215 }).text(String(p.age), cols[2] + 4, y)
      .text({ M: 'Male', F: 'Female', O: 'Other' }[p.gender], cols[3] + 4, y).text(p.coach || '-', cols[4] + 4, y).text(String(p.seat ?? '-'), cols[5] + 4, y);
    y += 18;
    doc.moveTo(L, y - 3).lineTo(L + W, y - 3).strokeColor(LINE).lineWidth(0.5).stroke();
  });

  // Fare + QR
  y += 14;
  const fareTop = y;
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text('Fare details', L, y);
  y += 18;
  const line = (label, val, bold) => {
    doc.fillColor(bold ? INK : MUTED).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10).text(label, L, y).text(val, L, y, { width: 260, align: 'right' });
    y += bold ? 20 : 16;
  };
  line('Base fare', rs(booking.fare.base));
  line('Reservation charge', rs(booking.fare.reservationCharge));
  line('GST', rs(booking.fare.gst));
  doc.moveTo(L, y).lineTo(L + 260, y).strokeColor(LINE).lineWidth(1).stroke(); y += 6;
  line('Total fare', rs(booking.fare.total), true);
  if (cancellation) line(`Refund (${cancellation.refundPercent}%, simulated)`, rs(cancellation.refundAmount));

  doc.image(qr, L + W - 130, fareTop, { width: 130 });
  doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text('Scan to verify this ticket', L + W - 130, fareTop + 132, { width: 130, align: 'center' });

  y = Math.max(y, fareTop + 150) + 14;
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(`Booked on: ${fmtDateTime(booking.bookedAt)} IST`, L, y);
  if (booking.cancelledAt) doc.text(`Cancelled on: ${fmtDateTime(booking.cancelledAt)} IST`, L, y + 13);

  // Footer
  doc.moveTo(L, 762).lineTo(L + W, 762).strokeColor(LINE).lineWidth(1).stroke();
  doc.fillColor(MUTED).fontSize(7.5).text(`${APP_NAME} is an independent educational project and is not affiliated with IRCTC or Indian Railways. This slip is not valid for actual rail travel.`, L, 768, { width: W, align: 'center', height: 30 });

  if (booking.status === S.CANCELLED) {
    doc.save().rotate(-30, { origin: [300, 420] }).fillColor(RED).opacity(0.12).font('Helvetica-Bold').fontSize(90).text('CANCELLED', 60, 380, { width: 480, align: 'center' }).restore();
  }
  doc.end();
  return done;
}

async function verifyByToken(token, bookingId) {
  const filter = { verificationToken: token };
  if (bookingId) filter._id = bookingId;
  const b = await Booking.findOne(filter);
  if (!b) throw ApiError.notFound('Ticket could not be verified', 'TICKET_NOT_FOUND');
  return {
    valid: b.status === S.CONFIRMED,
    status: b.status,
    pnr: b.pnr,
    train: { number: b.trainNumber, name: b.trainName },
    from: b.from, to: b.to, journeyDate: dateKey(b.journeyDate), classCode: b.classCode,
    passengers: b.passengers.map((p) => ({ name: maskName(p.name), age: p.age })),
  };
}

module.exports = { loadTicketBooking, buildTicketPdf, verifyByToken, verificationUrl };

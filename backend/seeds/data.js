'use strict';
// Sample, fictional timetable data for the educational project. Train numbers 90xxx are NOT real trains.

const stations = [
  ['NDLS', 'New Delhi', 'Delhi', 'Delhi'], ['BCT', 'Mumbai Central', 'Mumbai', 'Maharashtra'],
  ['KOTA', 'Kota Junction', 'Kota', 'Rajasthan'], ['BRC', 'Vadodara Junction', 'Vadodara', 'Gujarat'],
  ['ADI', 'Ahmedabad Junction', 'Ahmedabad', 'Gujarat'], ['JP', 'Jaipur Junction', 'Jaipur', 'Rajasthan'],
  ['HWH', 'Howrah Junction', 'Kolkata', 'West Bengal'], ['MAS', 'Chennai Central', 'Chennai', 'Tamil Nadu'],
  ['SBC', 'KSR Bengaluru City', 'Bengaluru', 'Karnataka'], ['HYB', 'Hyderabad Deccan', 'Hyderabad', 'Telangana'],
  ['CNB', 'Kanpur Central', 'Kanpur', 'Uttar Pradesh'], ['PNBE', 'Patna Junction', 'Patna', 'Bihar'],
  ['CDG', 'Chandigarh Junction', 'Chandigarh', 'Chandigarh'], ['UMB', 'Ambala Cantt', 'Ambala', 'Haryana'],
  ['LDH', 'Ludhiana Junction', 'Ludhiana', 'Punjab'], ['ASR', 'Amritsar Junction', 'Amritsar', 'Punjab'],
  ['PUNE', 'Pune Junction', 'Pune', 'Maharashtra'], ['BPL', 'Bhopal Junction', 'Bhopal', 'Madhya Pradesh'],
].map(([code, name, city, state]) => ({ code, name, city, state }));

const layouts = {
  SL: { baseFarePerKm: 0.7, reservationCharge: 20, coaches: ['S1', 'S2', 'S3', 'S4'].map((name) => ({ name, seats: 72 })) },
  '3A': { baseFarePerKm: 1.9, reservationCharge: 40, coaches: ['B1', 'B2', 'B3'].map((name) => ({ name, seats: 64 })) },
  '2A': { baseFarePerKm: 2.7, reservationCharge: 50, coaches: ['A1', 'A2'].map((name) => ({ name, seats: 48 })) },
  '1A': { baseFarePerKm: 4.6, reservationCharge: 60, coaches: [{ name: 'H1', seats: 24 }] },
  CC: { baseFarePerKm: 1.8, reservationCharge: 40, coaches: ['C1', 'C2', 'C3'].map((name) => ({ name, seats: 78 })) },
  '2S': { baseFarePerKm: 0.5, reservationCharge: 15, coaches: ['D1', 'D2'].map((name) => ({ name, seats: 108 })) },
};
const classes = (...codes) => codes.map((code) => ({ code, ...layouts[code] }));
const ALL = [0, 1, 2, 3, 4, 5, 6];

// stop: [stationCode, arrival, departure, dayOffset, distanceKm]
const trains = [
  { number: '90001', name: 'Gateway Rajdhani', type: 'RAJDHANI', classes: classes('3A', '2A', '1A'), days: ALL,
    stops: [['NDLS', null, '16:30', 0, 0], ['KOTA', '22:25', '22:35', 0, 465], ['BRC', '04:10', '04:20', 1, 920], ['BCT', '08:20', null, 1, 1384]] },
  { number: '90002', name: 'Gateway Rajdhani (Return)', type: 'RAJDHANI', classes: classes('3A', '2A', '1A'), days: ALL,
    stops: [['BCT', null, '17:00', 0, 0], ['BRC', '21:05', '21:15', 0, 464], ['KOTA', '02:10', '02:20', 1, 919], ['NDLS', '08:20', null, 1, 1384]] },
  { number: '90003', name: 'Howrah Mail', type: 'MAIL', classes: classes('SL', '3A', '2A', '1A'), days: ALL,
    stops: [['NDLS', null, '17:05', 0, 0], ['CNB', '22:50', '22:58', 0, 440], ['PNBE', '05:20', '05:30', 1, 1000], ['HWH', '10:10', null, 1, 1450]] },
  { number: '90004', name: 'Delhi Mail (Return)', type: 'MAIL', classes: classes('SL', '3A', '2A', '1A'), days: ALL,
    stops: [['HWH', null, '19:40', 0, 0], ['PNBE', '00:30', '00:40', 1, 450], ['CNB', '07:15', '07:25', 1, 1010], ['NDLS', '12:55', null, 1, 1450]] },
  { number: '90005', name: 'Shivalik Shatabdi', type: 'SHATABDI', classes: classes('CC'), days: [0, 1, 2, 3, 4, 5],
    stops: [['NDLS', null, '07:40', 0, 0], ['UMB', '10:20', '10:22', 0, 200], ['CDG', '11:15', null, 0, 240]] },
  { number: '90006', name: 'Shivalik Shatabdi (Return)', type: 'SHATABDI', classes: classes('CC'), days: [0, 1, 2, 3, 4, 5],
    stops: [['CDG', null, '17:30', 0, 0], ['UMB', '18:18', '18:20', 0, 40], ['NDLS', '21:15', null, 0, 240]] },
  { number: '90007', name: 'Punjab Superfast', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['NDLS', null, '21:15', 0, 0], ['UMB', '00:40', '00:45', 1, 200], ['LDH', '02:50', '02:55', 1, 310], ['ASR', '05:20', null, 1, 450]] },
  { number: '90008', name: 'Deccan Link Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['BCT', null, '14:10', 0, 0], ['PUNE', '18:05', '18:10', 0, 192], ['HYB', '05:30', null, 1, 710]] },
  { number: '90009', name: 'Garden City Intercity', type: 'EXPRESS', classes: classes('CC', '2S'), days: ALL,
    stops: [['SBC', null, '06:00', 0, 0], ['MAS', '11:00', null, 0, 360]] },
  { number: '90010', name: 'Southern Link', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['MAS', null, '18:30', 0, 0], ['HYB', '07:00', null, 1, 700]] },
  { number: '90011', name: 'Rajasthan Sampark', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: [0, 1, 3, 5],
    stops: [['NDLS', null, '19:40', 0, 0], ['JP', '00:35', '00:40', 1, 300], ['ADI', '08:30', null, 1, 880]] },
];

module.exports = { stations, trains };

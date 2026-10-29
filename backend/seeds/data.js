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
  // North-South Routes (Delhi to South)
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
  
  // Delhi to Mumbai Routes
  { number: '90012', name: 'Rajdhani Express Morning', type: 'RAJDHANI', classes: classes('3A', '2A', '1A'), days: [0, 2, 4, 6],
    stops: [['NDLS', null, '09:00', 0, 0], ['JP', '13:20', '13:25', 0, 300], ['ADI', '20:45', null, 0, 840]] },
  { number: '90013', name: 'Western Rajdhani', type: 'RAJDHANI', classes: classes('3A', '2A', '1A'), days: ALL,
    stops: [['NDLS', null, '14:45', 0, 0], ['BRC', '22:30', '22:40', 0, 650], ['BCT', '06:00', null, 1, 1384]] },
  { number: '90014', name: 'Gujarat Superfast', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['NDLS', null, '11:30', 0, 0], ['JP', '15:45', '15:50', 0, 300], ['ADI', '23:30', null, 0, 840]] },
  { number: '90015', name: 'Ahmedabad Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: [1, 3, 5],
    stops: [['NDLS', null, '08:00', 0, 0], ['BRC', '16:40', '16:50', 0, 650], ['ADI', '20:00', null, 0, 840]] },
  { number: '90016', name: 'Western Link Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A', 'CC'), days: ALL,
    stops: [['BCT', null, '19:30', 0, 0], ['PUNE', '23:15', '23:20', 0, 192], ['NDLS', '13:00', null, 1, 1384]] },
  
  // East Routes (Delhi to Kolkata)
  { number: '90017', name: 'Eastern Rajdhani', type: 'RAJDHANI', classes: classes('3A', '2A', '1A'), days: [2, 5],
    stops: [['NDLS', null, '16:00', 0, 0], ['PNBE', '04:45', '04:50', 1, 1000], ['HWH', '09:30', null, 1, 1450]] },
  { number: '90018', name: 'Howrah Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['NDLS', null, '20:15', 0, 0], ['CNB', '01:25', '01:30', 1, 440], ['HWH', '10:00', null, 1, 1450]] },
  { number: '90019', name: 'Bihar Superfast', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: [1, 4],
    stops: [['NDLS', null, '15:45', 0, 0], ['PNBE', '05:15', '05:20', 1, 1000], ['HWH', '10:45', null, 1, 1450]] },
  { number: '90020', name: 'Patna Mail', type: 'MAIL', classes: classes('SL', '3A'), days: ALL,
    stops: [['NDLS', null, '18:30', 0, 0], ['PNBE', '06:00', null, 1, 1000]] },
  { number: '90021', name: 'Kanpur Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A', 'CC'), days: ALL,
    stops: [['NDLS', null, '22:00', 0, 0], ['CNB', '02:50', null, 1, 440]] },
  
  // South Routes (Chennai, Bangalore, Hyderabad)
  { number: '90022', name: 'Bangalore Rajdhani', type: 'RAJDHANI', classes: classes('3A', '2A', '1A'), days: [1, 4],
    stops: [['NDLS', null, '12:30', 0, 0], ['BPL', '19:00', '19:10', 0, 930], ['SBC', '08:30', null, 1, 2150]] },
  { number: '90023', name: 'Deccan Queen', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['BCT', null, '17:20', 0, 0], ['PUNE', '21:10', '21:15', 0, 192], ['BPL', '06:45', '06:55', 1, 750]] },
  { number: '90024', name: 'Chennai Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: [0, 3, 6],
    stops: [['NDLS', null, '11:00', 0, 0], ['BPL', '18:00', '18:10', 0, 930], ['HYB', '04:30', '04:45', 1, 1550], ['MAS', '12:00', null, 1, 2150]] },
  { number: '90025', name: 'Hyderabad Superfast', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['NDLS', null, '17:30', 0, 0], ['BPL', '00:45', '01:00', 1, 930], ['HYB', '08:30', null, 1, 1550]] },
  { number: '90026', name: 'South India Express', type: 'EXPRESS', classes: classes('SL', '3A'), days: [2, 5],
    stops: [['NDLS', null, '20:00', 0, 0], ['SBC', '15:00', null, 1, 2150]] },
  { number: '90027', name: 'Tamil Nadu Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['BCT', null, '14:00', 0, 0], ['HYB', '04:30', '04:45', 1, 710], ['MAS', '12:00', null, 1, 1050]] },
  
  // Western Routes (Mumbai to Gujarat/Rajasthan)
  { number: '90028', name: 'Gujarat Mail', type: 'MAIL', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['BCT', null, '20:30', 0, 0], ['BRC', '02:10', '02:20', 1, 464], ['ADI', '06:30', null, 1, 640]] },
  { number: '90029', name: 'Saurashtra Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: [1, 3, 5],
    stops: [['BCT', null, '22:00', 0, 0], ['BRC', '03:45', '03:55', 1, 464], ['ADI', '08:00', null, 1, 640]] },
  { number: '90030', name: 'Vadodara Fast', type: 'EXPRESS', classes: classes('SL', '2A'), days: ALL,
    stops: [['BCT', null, '06:15', 0, 0], ['BRC', '10:30', null, 0, 464]] },
  { number: '90031', name: 'Kota Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['NDLS', null, '18:00', 0, 0], ['JP', '22:30', '22:35', 0, 300], ['KOTA', '02:20', null, 1, 765]] },
  { number: '90032', name: 'Jaipur Shatabdi', type: 'SHATABDI', classes: classes('CC'), days: [0, 1, 2, 3, 4, 5],
    stops: [['NDLS', null, '08:00', 0, 0], ['JP', '11:45', null, 0, 300]] },
  { number: '90033', name: 'Jaipur Shatabdi Return', type: 'SHATABDI', classes: classes('CC'), days: [0, 1, 2, 3, 4, 5],
    stops: [['JP', null, '18:00', 0, 0], ['NDLS', '21:45', null, 0, 300]] },
  
  // North Routes (Punjab, Chandigarh)
  { number: '90034', name: 'Amritsar Express', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: [0, 2, 4, 6],
    stops: [['NDLS', null, '19:30', 0, 0], ['UMB', '22:50', '22:55', 0, 200], ['ASR', '04:00', null, 1, 450]] },
  { number: '90035', name: 'Punjab Mail', type: 'MAIL', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['NDLS', null, '21:00', 0, 0], ['LDH', '03:30', null, 1, 310]] },
  { number: '90036', name: 'Chandigarh Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A', 'CC'), days: ALL,
    stops: [['NDLS', null, '07:00', 0, 0], ['CDG', '10:30', null, 0, 240]] },
  { number: '90037', name: 'Ludhiana Fast', type: 'EXPRESS', classes: classes('SL', '3A', 'CC'), days: [1, 3, 5],
    stops: [['NDLS', null, '14:15', 0, 0], ['LDH', '17:45', null, 0, 310]] },
  { number: '90038', name: 'North Western Link', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['CDG', null, '12:00', 0, 0], ['NDLS', '15:30', null, 0, 240]] },
  
  // Additional Intermediate Routes
  { number: '90039', name: 'Kota Jaipur Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['KOTA', null, '08:30', 0, 0], ['JP', '12:45', null, 0, 300]] },
  { number: '90040', name: 'Vadodara Ahmedabad Link', type: 'EXPRESS', classes: classes('SL', '2A', 'CC'), days: ALL,
    stops: [['BRC', null, '09:00', 0, 0], ['ADI', '13:15', null, 0, 176]] },
  { number: '90041', name: 'Mumbai Pune Express', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['BCT', null, '06:00', 0, 0], ['PUNE', '10:00', null, 0, 192]] },
  { number: '90042', name: 'Pune Hyderabad Fast', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: [0, 2, 4, 6],
    stops: [['PUNE', null, '11:30', 0, 0], ['HYB', '18:45', null, 0, 518]] },
  { number: '90043', name: 'Hyderabad Chennai Link', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['HYB', null, '14:00', 0, 0], ['MAS', '21:30', null, 0, 700]] },
  { number: '90044', name: 'Chennai Bangalore Link', type: 'EXPRESS', classes: classes('SL', '3A'), days: [1, 4],
    stops: [['MAS', null, '07:00', 0, 0], ['SBC', '14:30', null, 0, 360]] },
  
  // More Delhi Routes (varied timings)
  { number: '90045', name: 'Delhi Express Morning', type: 'EXPRESS', classes: classes('SL', '3A', '2A', 'CC'), days: ALL,
    stops: [['NDLS', null, '06:00', 0, 0], ['CNB', '10:40', null, 0, 440]] },
  { number: '90046', name: 'Delhi Express Evening', type: 'EXPRESS', classes: classes('SL', '3A', '2A', 'CC'), days: ALL,
    stops: [['NDLS', null, '19:00', 0, 0], ['PNBE', '06:30', null, 1, 1000]] },
  { number: '90047', name: 'Delhi Fast Afternoon', type: 'EXPRESS', classes: classes('SL', '3A', 'CC'), days: [0, 1, 2, 3, 4, 5],
    stops: [['NDLS', null, '13:30', 0, 0], ['ADI', '21:00', null, 0, 840]] },
  
  // Mumbai-Bangalore Premium Routes
  { number: '90048', name: 'Mysore Express Premium', type: 'RAJDHANI', classes: classes('3A', '2A', '1A'), days: [2, 5],
    stops: [['BCT', null, '15:45', 0, 0], ['HYB', '05:30', '05:45', 1, 710], ['SBC', '14:00', null, 1, 1050]] },
  { number: '90049', name: 'Karnataka Express', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['BCT', null, '18:00', 0, 0], ['PUNE', '21:45', '21:50', 0, 192], ['SBC', '15:30', null, 1, 1050]] },
  { number: '90050', name: 'Bangalore Direct', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: [1, 3, 5],
    stops: [['BCT', null, '20:30', 0, 0], ['SBC', '14:45', null, 1, 1050]] },
  
  // Long-haul routes
  { number: '90051', name: 'India Express North-South', type: 'RAJDHANI', classes: classes('3A', '2A', '1A'), days: [1, 4],
    stops: [['NDLS', null, '10:00', 0, 0], ['JP', '13:45', '13:50', 0, 300], ['ADI', '21:00', '21:10', 0, 840], ['BCT', '06:00', null, 1, 1384]] },
  { number: '90052', name: 'Eastern Cross Express', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['HWH', null, '15:30', 0, 0], ['PNBE', '10:15', '10:20', 0, 450], ['CNB', '17:00', '17:05', 0, 1010], ['NDLS', '22:45', null, 0, 1450]] },
  { number: '90053', name: 'Southern Route Premium', type: 'RAJDHANI', classes: classes('3A', '2A', '1A'), days: [0, 3, 6],
    stops: [['NDLS', null, '16:00', 0, 0], ['BPL', '23:00', '23:10', 0, 930], ['HYB', '07:00', '07:15', 1, 1550], ['MAS', '14:30', null, 1, 2150]] },
  { number: '90054', name: 'India Link Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: [2, 5],
    stops: [['BCT', null, '12:00', 0, 0], ['PUNE', '15:45', '15:50', 0, 192], ['HYB', '23:15', '23:30', 0, 710], ['SBC', '09:00', null, 1, 1050]] },
  
  // Fast commuter-style routes
  { number: '90055', name: 'Delhi Metro Express', type: 'EXPRESS', classes: classes('SL', 'CC', '2S'), days: ALL,
    stops: [['NDLS', null, '07:30', 0, 0], ['UMB', '10:00', null, 0, 200]] },
  { number: '90056', name: 'Mumbai Metro Express', type: 'EXPRESS', classes: classes('SL', 'CC', '2S'), days: ALL,
    stops: [['BCT', null, '08:00', 0, 0], ['PUNE', '12:00', null, 0, 192]] },
  { number: '90057', name: 'Chennai Metro Link', type: 'EXPRESS', classes: classes('SL', 'CC', '2S'), days: ALL,
    stops: [['MAS', null, '07:00', 0, 0], ['HYB', '14:30', null, 0, 700]] },
  { number: '90058', name: 'Bangalore Metro Connect', type: 'EXPRESS', classes: classes('SL', 'CC', '2S'), days: ALL,
    stops: [['SBC', null, '06:30', 0, 0], ['HYB', '13:00', null, 0, 560]] },
  
  // Regional connections
  { number: '90059', name: 'Gujarat Circuit 1', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: [1, 4],
    stops: [['ADI', null, '07:00', 0, 0], ['BRC', '09:15', null, 0, 176]] },
  { number: '90060', name: 'Gujarat Circuit 2', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: [2, 5],
    stops: [['BRC', null, '11:00', 0, 0], ['ADI', '13:15', null, 0, 176]] },
  { number: '90061', name: 'Rajasthan Circuit', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['JP', null, '09:30', 0, 0], ['KOTA', '13:45', null, 0, 465]] },
  { number: '90062', name: 'North Circuit Express', type: 'EXPRESS', classes: classes('SL', '3A', 'CC'), days: ALL,
    stops: [['CDG', null, '08:00', 0, 0], ['UMB', '09:00', '09:05', 0, 40], ['LDH', '11:30', null, 0, 270]] },
  { number: '90063', name: 'East Circuit Express', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: [0, 3, 6],
    stops: [['PNBE', null, '09:00', 0, 0], ['CNB', '16:00', null, 0, 560]] },
  
  // Additional cross-country routes
  { number: '90064', name: 'Trans-India North', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['NDLS', null, '12:00', 0, 0], ['JP', '15:30', '15:35', 0, 300], ['ADI', '23:00', null, 0, 840]] },
  { number: '90065', name: 'Trans-India South', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['NDLS', null, '09:00', 0, 0], ['BPL', '16:00', '16:10', 0, 930], ['SBC', '04:30', null, 1, 2150]] },
  { number: '90066', name: 'Trans-India East', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: [1, 4],
    stops: [['NDLS', null, '19:00', 0, 0], ['PNBE', '06:30', '06:40', 1, 1000], ['HWH', '11:30', null, 1, 1450]] },
  { number: '90067', name: 'Trans-India West', type: 'SUPERFAST', classes: classes('SL', '3A', '2A'), days: [2, 5],
    stops: [['NDLS', null, '14:30', 0, 0], ['JP', '18:45', '18:50', 0, 300], ['ADI', '02:30', '02:40', 1, 840], ['BCT', '08:00', null, 1, 1384]] },
  { number: '90068', name: 'Trans-India Central', type: 'EXPRESS', classes: classes('SL', '3A', '2A'), days: ALL,
    stops: [['BCT', null, '11:00', 0, 0], ['PUNE', '14:45', '14:50', 0, 192], ['BPL', '23:30', '23:40', 0, 750], ['NDLS', '09:15', null, 1, 1384]] },
];

module.exports = { stations, trains };

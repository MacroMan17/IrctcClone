'use strict';

// Removes keys beginning with "$" or containing "." so user input can never become a Mongo operator.
function clean(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) delete obj[key];
    else clean(obj[key]);
  }
}

module.exports = function sanitize(req, _res, next) {
  clean(req.body);
  clean(req.query); // mutated in place (req.query is a getter in Express 5)
  clean(req.params);
  next();
};

'use strict';
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl.split('?')[0]} not found`, 'ROUTE_NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = 500;
  let code = 'INTERNAL';
  let message = 'Something went wrong';
  let details = [];

  if (err instanceof ApiError) {
    ({ status, code, message, details } = err);
  } else if (err?.name === 'ValidationError' && err.errors) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err?.name === 'CastError') {
    status = 400; code = 'VALIDATION_ERROR'; message = `Invalid value for ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409; code = 'DUPLICATE'; message = 'A record with these details already exists';
    details = Object.keys(err.keyPattern || {}).map((k) => ({ path: k, message: 'must be unique' }));
  } else if (err?.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body too large';
  } else if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    status = 400; code = 'INVALID_JSON'; message = 'Request body is not valid JSON';
  }

  if (status >= 500) logger.error({ err, path: req.originalUrl, method: req.method }, 'Unhandled error');
  else logger.debug({ code, path: req.originalUrl }, message);

  res.status(status).json({ success: false, error: { code, message, details } });
}

module.exports = { errorHandler, notFoundHandler };

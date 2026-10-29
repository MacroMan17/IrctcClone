'use strict';

class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(message = 'Bad request', details) { return new ApiError(400, 'BAD_REQUEST', message, details); }
  static validation(details, message = 'Validation failed') { return new ApiError(400, 'VALIDATION_ERROR', message, details); }
  static unauthorized(message = 'Authentication required') { return new ApiError(401, 'UNAUTHENTICATED', message); }
  static forbidden(message = 'You do not have permission to do that') { return new ApiError(403, 'FORBIDDEN', message); }
  static notFound(message = 'Resource not found', code = 'NOT_FOUND') { return new ApiError(404, code, message); }
  static conflict(code, message) { return new ApiError(409, code, message); }
  static gone(code, message) { return new ApiError(410, code, message); }
}

module.exports = ApiError;

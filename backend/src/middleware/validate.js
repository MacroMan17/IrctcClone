'use strict';
const ApiError = require('../utils/ApiError');

/**
 * validate({ body, query, params }) with zod schemas.
 * Parsed (and coerced/stripped) values are exposed on req.valid.{body,query,params}.
 * (Express 5 makes req.query read-only, so we never overwrite it.)
 */
const validate = (schemas) => (req, _res, next) => {
  const issues = [];
  req.valid = req.valid || {};
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (result.success) req.valid[key] = result.data;
    else {
      for (const i of result.error.issues) {
        issues.push({ path: [key, ...i.path].join('.'), message: i.message });
      }
    }
  }
  if (issues.length) return next(ApiError.validation(issues));
  return next();
};

module.exports = validate;

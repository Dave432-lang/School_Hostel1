/**
 * Global Express error handler.
 * Must be registered LAST in app.js.
 */
module.exports = (err, req, res, next) => {
  console.error('[Error]', err.message);

  const status  = err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ message: 'A record with that value already exists.' });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced record does not exist.' });
  }

  res.status(status).json({ message });
};

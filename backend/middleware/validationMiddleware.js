// Basic XSS Sanitization Middleware
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  for (let key in obj) {
    if (typeof obj[key] === 'string') {
      // Basic stripping of HTML tags
      obj[key] = obj[key].replace(/</g, "&lt;").replace(/>/g, "&gt;");
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

const validateRegister = (req, res, next) => {
  const { first_name, last_name, email, password } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!first_name || !last_name) return res.status(400).json({ error: 'First and last name are required.' });
  next();
};

module.exports = { sanitizeInput, validateRegister };

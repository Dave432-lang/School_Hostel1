const jwt = require('jsonwebtoken');
const pool = require('../config/dbConfig');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    token = req.cookies?.token;
  }
  
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      console.error('[AuthMiddleware] isAdmin: No user ID in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const r = await pool.query('SELECT role FROM users WHERE id=?', [req.user.id]);
    
    if (r.rows && r.rows.length > 0 && r.rows[0].role === 'admin') {
      req.user.role = r.rows[0].role; // Attach role
      next();
    } else {
      res.status(403).json({ error: 'Admin privileges required' });
    }
  } catch (err) {
    console.error('[AuthMiddleware] isAdmin error:', err.message);
    res.status(500).json({ error: 'Error checking admin role' });
  }
};

const isManager = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      console.error('[AuthMiddleware] isManager: No user ID in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const r = await pool.query('SELECT role FROM users WHERE id=?', [req.user.id]);
    
    if (r.rows && r.rows.length > 0 && (r.rows[0].role === 'manager' || r.rows[0].role === 'admin')) {
      req.user.role = r.rows[0].role; // Attach role
      next();
    } else {
      res.status(403).json({ error: 'Manager privileges required' });
    }
  } catch (err) {
    console.error('[AuthMiddleware] isManager error:', err.message);
    res.status(500).json({ error: 'Error checking manager role' });
  }
};

const isAdminOrManager = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      console.error('[AuthMiddleware] isAdminOrManager: No user ID in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const r = await pool.query('SELECT role FROM users WHERE id=?', [req.user.id]);
    const role = r.rows[0]?.role;
    if (role === 'admin' || role === 'manager') {
      req.user.role = role; // Attach role
      next();
    } else {
      res.status(403).json({ error: 'Privileged access required' });
    }
  } catch (err) {
    console.error('[AuthMiddleware] isAdminOrManager error:', err.message);
    res.status(500).json({ error: 'Error checking user role' });
  }
};

module.exports = {
  authenticateToken,
  isAdmin,
  isManager,
  isAdminOrManager
};

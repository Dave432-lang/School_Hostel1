const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/dbConfig');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');

exports.register = async (req, res, next) => {
  const { first_name, last_name, student_id, programme, year_of_study, email, password } = req.body;
  if (!first_name || !last_name || !email || !password) return res.status(400).json({ error: 'First name, last name, email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'An account with this email already exists' });
    const hash  = await bcrypt.hash(password, 10);
    const r     = await pool.query(
      'INSERT INTO users (first_name,last_name,student_id,programme,year_of_study,email,password) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,first_name,last_name,email', 
      [first_name, last_name, student_id, programme, year_of_study, email, hash]
    );
    const user  = r.rows[0];
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ 
      message: 'Registered successfully', 
      token,
      user_id: user.id, 
      name: user.first_name + ' ' + user.last_name,
      role: 'student'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const r    = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok   = await bcrypt.compare(password, user.password);
    if (!ok)   return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      message: 'Login successful', 
      token,
      user_id: user.id, 
      name: user.first_name + ' ' + (user.last_name || ''),
      role: user.role || 'student'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const r = await pool.query('SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id=$1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const crypto = require('crypto');
const { sendEmail } = require('../utils/email');

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const r = await pool.query('SELECT id, first_name FROM users WHERE email=$1', [email]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query('UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3', [token, expires, r.rows[0].id]);

    const origin = req.headers.origin || 'http://localhost:5500';
    // Note: since it's inside /pages, we map the link exactly to the future frontend file
    const resetLink = `${origin}/pages/reset-password.html?token=${token}`;

    const emailSent = await sendEmail(
      email,
      'Password Reset Request',
      `<p>Hi ${r.rows[0].first_name},</p><p>You requested a password reset. Click the link below to safely set a new password:</p>
       <a href="${resetLink}" style="padding:10px 15px;background:#2563eb;color:#fff;text-decoration:none;border-radius:5px;display:inline-block;margin-top:10px;">Reset Password</a>
       <p style="margin-top:20px;font-size:0.8rem;color:#666;">If you did not request this, you can safely ignore this email.</p>`
    );

    if (emailSent) {
      res.json({ message: 'Password reset link dispatched to your inbox.' });
    } else {
      res.json({ message: 'Password reset link sent (console simulation only due to no SMTP config).' });
      console.log('SIMULATED RESET LINK:', resetLink);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process request.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required.' });
  
  try {
    const r = await pool.query('SELECT id FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()', [token]);
    if (!r.rows.length) return res.status(400).json({ error: 'Invalid or expired reset token.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2', [hashedPassword, r.rows[0].id]);
    
    res.json({ message: 'Password successfully reset. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
};

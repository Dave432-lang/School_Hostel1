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
    
    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 600000); // 10 minutes

    await pool.query('UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3', [otp, expires, r.rows[0].id]);

    const emailSent = await sendEmail(
      email,
      'Your Secure OTP Code',
      `<p>Hi ${r.rows[0].first_name},</p>
       <p>You requested a password reset. Here is your 6-digit secure authentication code. It expires in 10 minutes.</p>
       <div style="padding:15px;background:#f1f5f9;border-radius:8px;font-size:24px;font-weight:bold;letter-spacing:4px;text-align:center;width:200px;margin:20px auto;color:#2563eb;">${otp}</div>
       <p style="font-size:0.8rem;color:#666;">If you did not make this request, you can safely ignore this message.</p>`
    );

    if (emailSent) {
      res.json({ message: 'Security code dispatched to your inbox.' });
    } else {
      res.json({ message: 'OTP visually bypassed (console simulation only due to SMTP config).' });
      console.log(`\n============================\n🔑 SIMULATED OTP CODE: ${otp}\n============================\n`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process request.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
  
  try {
    const r = await pool.query('SELECT id FROM users WHERE email=$1 AND reset_token=$2 AND reset_token_expires > NOW()', [email, otp]);
    if (!r.rows.length) return res.status(400).json({ error: 'Invalid or expired OTP code.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2', [hashedPassword, r.rows[0].id]);
    
    res.json({ message: 'Password successfully reset. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
};

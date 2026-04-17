const express = require('express');
const router  = express.Router();
const { register, login, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateRegister } = require('../middleware/validationMiddleware');

// POST /api/auth/register
router.post('/register', validateRegister, register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me  (protected)
router.get('/me', authenticateToken, getMe);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

module.exports = router;

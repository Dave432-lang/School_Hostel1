const express = require('express');
const router = express.Router();
const { initializePayment, verifyPayment, paystackWebhook } = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/initialize', authenticateToken, initializePayment);
router.post('/verify', authenticateToken, verifyPayment);
router.post('/webhook', paystackWebhook); // Webhook does NOT use authenticateToken

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  createBooking,
  getUserBookings,
  cancelBooking,
  initializePayment,
  verifyPayment
} = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, createBooking);
router.get('/:userId', authenticateToken, getUserBookings);
router.patch('/:bookingId/cancel', authenticateToken, cancelBooking);

module.exports = router;

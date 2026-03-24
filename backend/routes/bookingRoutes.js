const express = require('express');
const router  = express.Router();
const { createBooking, getMyBookings, cancelBooking } = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

// All booking routes are protected
router.use(authMiddleware);

// POST /api/bookings
router.post('/', createBooking);

// GET /api/bookings/my
router.get('/my', getMyBookings);

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', cancelBooking);

module.exports = router;

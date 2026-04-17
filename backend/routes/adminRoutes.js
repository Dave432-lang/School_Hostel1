const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getAdminBookings,
  updateBookingStatus,
  getAdminStats,
  getAdminUsers,
  getPublicStats
} = require('../controllers/adminController');
const { getAdminChatGrouped } = require('../controllers/chatController');
const { getAdminWaitlist } = require('../controllers/waitlistController');
const { authenticateToken, isAdmin, isManager } = require('../middleware/authMiddleware');

router.get('/analytics', authenticateToken, isAdmin, getAnalytics);
router.get('/bookings', authenticateToken, isManager, getAdminBookings);
router.patch('/bookings/:id/status', authenticateToken, isManager, updateBookingStatus);
router.get('/stats', authenticateToken, isManager, getAdminStats);
router.get('/users', authenticateToken, isAdmin, getAdminUsers);
router.get('/chat/grouped', authenticateToken, isManager, getAdminChatGrouped);
router.get('/waitlist/:hostelId', authenticateToken, isManager, getAdminWaitlist);
router.get('/public-stats', getPublicStats); // moved from PublicStats

module.exports = router;

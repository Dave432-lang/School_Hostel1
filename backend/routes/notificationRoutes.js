const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead } = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, getNotifications);
router.patch('/:id/read', authenticateToken, markAsRead);

module.exports = router;

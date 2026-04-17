const express = require('express');
const router = express.Router();
const { joinWaitlist, getAdminWaitlist } = require('../controllers/waitlistController');
const { authenticateToken, isManager } = require('../middleware/authMiddleware');

router.post('/join', authenticateToken, joinWaitlist);

module.exports = router;

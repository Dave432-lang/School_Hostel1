const express = require('express');
const router = express.Router();
const { getChatMessages, getAdminChatGrouped, sendMessage } = require('../controllers/chatController');
const { authenticateToken, isManager } = require('../middleware/authMiddleware');

router.get('/:hostelId', authenticateToken, getChatMessages);
router.post('/', authenticateToken, sendMessage);

module.exports = router;

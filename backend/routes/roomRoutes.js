const express = require('express');
const router = express.Router();
const {
  getRoomsByHostelId,
  createRoom,
  deleteRoom
} = require('../controllers/roomController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/:hostelId', getRoomsByHostelId);
router.post('/', authenticateToken, isAdmin, createRoom);
router.delete('/:id', authenticateToken, isAdmin, deleteRoom);

module.exports = router;

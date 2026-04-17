const express = require('express');
const router = express.Router();
const {
  getAllHostels,
  getHostelById,
  getHostelReviews,
  createHostel,
  updateHostel,
  deleteHostel
} = require('../controllers/hostelController');
const { authenticateToken, isAdmin, isAdminOrManager } = require('../middleware/authMiddleware');

router.get('/', getAllHostels);
router.get('/:id', getHostelById);
router.get('/:id/reviews', getHostelReviews);

router.post('/', authenticateToken, isAdmin, createHostel);
router.put('/:id', authenticateToken, isAdminOrManager, updateHostel);
router.delete('/:id', authenticateToken, isAdmin, deleteHostel);

module.exports = router;

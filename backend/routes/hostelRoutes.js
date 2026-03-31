const express = require('express');
const router = express.Router();
const { getAllHostels, getHostelById } = require('../controllers/hostelController');

// GET /api/hostels          (public — students browse without login)
router.get('/', getAllHostels);

// GET /api/hostels/:id      (public)
router.get('/:id', getHostelById);

module.exports = router;


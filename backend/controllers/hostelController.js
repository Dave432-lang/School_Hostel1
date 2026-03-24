const Hostel = require('../models/Hostel');

/** GET /api/hostels */
exports.getAllHostels = async (req, res, next) => {
  try {
    const { type, gender } = req.query;
    const hostels = await Hostel.getAll({ type, gender });
    res.json({ hostels, total: hostels.length });
  } catch (err) {
    next(err);
  }
};

/** GET /api/hostels/:id */
exports.getHostelById = async (req, res, next) => {
  try {
    const hostel = await Hostel.getById(req.params.id);
    if (!hostel)
      return res.status(404).json({ message: 'Hostel not found.' });
    res.json({ hostel });
  } catch (err) {
    next(err);
  }
};

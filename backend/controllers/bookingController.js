const Booking = require('../models/Booking');
const Room    = require('../models/Room');

/** POST /api/bookings */
exports.createBooking = async (req, res, next) => {
  try {
    const { hostel_id, room_type, semester, academic_year } = req.body;
    const userId = req.user.id;

    if (!hostel_id || !room_type || !semester || !academic_year)
      return res.status(400).json({ message: 'hostel_id, room_type, semester, and academic_year are required.' });

    // Find an available room of the requested type
    const room = await Room.getAvailable(hostel_id, room_type);
    if (!room)
      return res.status(409).json({ message: 'No available rooms of that type in this hostel.' });

    // Mark room as booked
    await Room.markUnavailable(room.id);

    const booking = await Booking.create({
      userId,
      hostelId:     hostel_id,
      roomId:       room.id,
      roomType:     room_type,
      semester,
      academicYear: academic_year,
    });

    res.status(201).json({ message: 'Booking created successfully.', booking });
  } catch (err) {
    next(err);
  }
};

/** GET /api/bookings/my */
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.getByUserId(req.user.id);
    res.json({ bookings, total: bookings.length });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/bookings/:id/cancel */
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.getById(req.params.id);

    if (!booking)
      return res.status(404).json({ message: 'Booking not found.' });

    if (booking.user_id !== req.user.id)
      return res.status(403).json({ message: 'Not authorised to cancel this booking.' });

    if (booking.status === 'cancelled')
      return res.status(400).json({ message: 'Booking is already cancelled.' });

    // Free the room
    if (booking.room_id) await Room.markAvailable(booking.room_id);

    const updated = await Booking.updateStatus(booking.id, 'cancelled');
    res.json({ message: 'Booking cancelled.', booking: updated });
  } catch (err) {
    next(err);
  }
};

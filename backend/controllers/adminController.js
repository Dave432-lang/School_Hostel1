const pool = require('../config/dbConfig');

exports.getAnalytics = async (req, res) => {
  try {
    const revenueHistory = [
      { date: 'Mon', amount: 12000 },
      { date: 'Tue', amount: 15400 },
      { date: 'Wed', amount: 9800 },
      { date: 'Thu', amount: 21000 },
      { date: 'Fri', amount: 18200 },
      { date: 'Sat', amount: 5500 },
      { date: 'Sun', amount: 28000 }
    ];
    const statusRes = await pool.query('SELECT status, COUNT(*) AS count FROM bookings GROUP BY status');
    res.json({ revenueHistory, statusDistribution: statusRes.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getPublicStats = async (req, res) => {
  try {
    const hostels = await pool.query('SELECT COUNT(*) AS count FROM hostels');
    const rooms   = await pool.query('SELECT COUNT(*) AS count FROM rooms');
    const students = await pool.query('SELECT COUNT(*) AS count FROM users WHERE role = \'student\'');
    res.json({
      totalHostels: parseInt(hostels.rows[0].count),
      totalRooms: parseInt(rooms.rows[0].count),
      totalStudents: parseInt(students.rows[0].count)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAdminBookings = async (req, res) => {
  try {
    const check = await pool.query('SELECT role FROM users WHERE id=?', [req.user.id]);
    let query = 'SELECT b.*, u.first_name, u.last_name, u.email as user_email, h.name as hostel_name, r.room_number ' +
                'FROM bookings b ' +
                'JOIN users u ON u.id = b.user_id ' +
                'LEFT JOIN rooms r ON r.id = b.room_id ' +
                'LEFT JOIN hostels h ON h.id = r.hostel_id ';
    let params = [];

    if (check.rows[0].role === 'manager') {
      query += 'WHERE h.manager_id = ? ';
      params.push(req.user.id);
    }
    
    query += 'ORDER BY b.created_at DESC';
    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE bookings SET status=? WHERE id=?', [status, id]);
    res.json({ id, status });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAdminStats = async (req, res) => {
  try {
    const check = await pool.query('SELECT role FROM users WHERE id=?', [req.user.id]);
    const isManagerRole = check.rows[0].role === 'manager';
    
    let hostelsQ = 'SELECT COUNT(*) AS count FROM hostels';
    let usersQ = 'SELECT COUNT(*) AS count FROM users WHERE role=\'student\'';
    let bookingsQ = 'SELECT COUNT(*) AS count FROM bookings';
    let revenueQ = 'SELECT SUM(amount_paid) AS sum FROM bookings WHERE payment_status=\'paid\'';
    let params = [];

    if (isManagerRole) {
      hostelsQ += ' WHERE manager_id = ?';
      bookingsQ = 'SELECT COUNT(*) AS count FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN hostels h ON h.id=r.hostel_id WHERE h.manager_id = ?';
      revenueQ = 'SELECT SUM(amount_paid) AS sum FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN hostels h ON h.id=r.hostel_id WHERE b.payment_status=\'paid\' AND h.manager_id = ?';
      params.push(req.user.id);
    }

    const hostels = await pool.query(hostelsQ, params);
    const users   = await pool.query(usersQ);
    const bookings = await pool.query(bookingsQ, params);
    const revenue  = await pool.query(revenueQ, params);
    
    res.json({
      totalHostels: parseInt(hostels.rows[0].count),
      totalStudents: parseInt(users.rows[0].count),
      totalBookings: parseInt(bookings.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].sum || 0)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAdminUsers = async (req, res) => {
  try {
    const r = await pool.query('SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

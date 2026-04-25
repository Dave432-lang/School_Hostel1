const pool = require('../config/dbConfig');

exports.joinWaitlist = async (req, res) => {
  const { hostel_id } = req.body;
  const user_id = req.user.id;
  try {
     const exists = await pool.query('SELECT * FROM waitlist WHERE user_id=? AND hostel_id=?', [user_id, hostel_id]);
     if (exists.rows.length) return res.status(409).json({ error: 'You are already on the waitlist for this hostel' });
     
     await pool.query('INSERT INTO waitlist (user_id, hostel_id) VALUES (?,?)', [user_id, hostel_id]);
     res.status(201).json({ message: 'Successfully joined the waitlist!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAdminWaitlist = async (req, res) => {
  try {
     const hostel = await pool.query('SELECT manager_id FROM hostels WHERE id=?', [req.params.hostelId]);
     if (!hostel.rows.length) return res.status(404).json({ error: 'Hostel not found' });
     
     if (req.user.role === 'manager' && hostel.rows[0].manager_id !== req.user.id) {
       return res.status(403).json({ error: 'You do not manage this hostel' });
     }

     const r = await pool.query(
       'SELECT w.*, u.first_name, u.last_name, u.email FROM waitlist w ' +
       'JOIN users u ON u.id = w.user_id ' +
       'WHERE w.hostel_id = ? ORDER BY w.created_at ASC',
       [req.params.hostelId]
     );
     res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

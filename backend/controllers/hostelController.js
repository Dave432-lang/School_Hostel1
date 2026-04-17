const pool = require('../config/dbConfig');

exports.getAllHostels = async (req, res) => {
  try {
    const query = `
      SELECT h.*, 
             u.first_name || ' ' || u.last_name as manager_name,
             u.email as manager_email,
             (SELECT COUNT(*) FROM rooms r WHERE r.hostel_id = h.id AND r.is_available = true) as available_rooms
      FROM hostels h
      LEFT JOIN users u ON h.manager_id = u.id
      ORDER BY h.name ASC
    `;
    const r = await pool.query(query);
    res.json(r.rows);
  } catch (err) {
    console.error('❌ /hostels:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getHostelById = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM hostels WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getHostelReviews = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM reviews WHERE hostel_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createHostel = async (req, res) => {
  const { name, location, description, type, gender, price_per_semester, amenities, image_urls, latitude, longitude, manager_id } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO hostels (name, location, description, type, gender, price_per_semester, amenities, image_urls, latitude, longitude, manager_id) ' +
      'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [name, location, description, type, gender, price_per_semester, JSON.stringify(amenities || []), JSON.stringify(image_urls || {}), latitude, longitude, manager_id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateHostel = async (req, res) => {
  const { id } = req.params;
  const { name, location, description, type, gender, price_per_semester, amenities, image_urls, latitude, longitude, manager_id } = req.body;
  try {
    // If manager, verify ownership
    const check = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    if (check.rows[0].role === 'manager') {
       const ownership = await pool.query('SELECT manager_id FROM hostels WHERE id=$1', [id]);
       if (ownership.rows[0]?.manager_id !== req.user.id) return res.status(403).json({ error: 'You do not manage this hostel' });
    }

    const r = await pool.query(
      'UPDATE hostels SET name=$1, location=$2, description=$3, type=$4, gender=$5, price_per_semester=$6, amenities=$7, image_urls=$8, latitude=$9, longitude=$10, manager_id=$11 ' +
      'WHERE id=$12 RETURNING *',
      [name, location, description, type, gender, price_per_semester, JSON.stringify(amenities || []), JSON.stringify(image_urls || {}), latitude, longitude, manager_id || null, id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteHostel = async (req, res) => {
  try {
    await pool.query('DELETE FROM hostels WHERE id=$1', [req.params.id]);
    res.json({ message: 'Hostel deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

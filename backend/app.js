const express  = require('express');
const cors     = require('cors');
const dotenv   = require('dotenv');

dotenv.config();

const authRoutes    = require('./routes/authRoutes');
const hostelRoutes  = require('./routes/hostelRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const errorHandler  = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ---- Middleware ---- */
app.use(cors({ origin: '*' }));       // Allow frontend HTML pages
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---- Routes ---- */
app.get('/', (req, res) => {
  res.json({ message: 'Hostel Booking System API is running ✅', version: '1.0.0' });
});

app.use('/api/auth',     authRoutes);
app.use('/api/hostels',  hostelRoutes);
app.use('/api/bookings', bookingRoutes);

/* ---- 404 Handler ---- */
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

/* ---- Global Error Handler ---- */
app.use(errorHandler);

/* ---- Start Server ---- */
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

module.exports = app;
const path    = require('path');
const isPkg   = typeof process.pkg !== 'undefined';
const baseDir = isPkg ? path.dirname(process.execPath) : __dirname;

require('dotenv').config({ path: path.join(baseDir, '.env') });
const express = require('express');
const cors    = require('cors');
const cookieParser = require('cookie-parser');
const http    = require('http');
const { Server } = require('socket.io');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const payRoutes = require('./routes/payRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { getPublicStats } = require('./controllers/adminController');
const { sanitizeInput } = require('./middleware/validationMiddleware');

const PORT = 5000;
const app  = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Hook up generic real-time bindings
io.on('connection', (socket) => {
  socket.on('join_user', (userId) => {
    socket.join('user_' + userId); // users join a room named for their ID
  });
});

// Put io into app context so controllers can access it!
app.set('io', io);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(sanitizeInput);

// Serve frontend
const frontendPath = isPkg ? path.join(baseDir, 'frontend') : path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Public routes explicitly mapped to match frontend expectations
app.get('/public/stats', getPublicStats);

// Mount API Routers
app.use('/', authRoutes);             // /login, /register, /me
app.use('/hostels', hostelRoutes);    // /hostels, /hostels/:id, etc
app.use('/rooms', roomRoutes);        // /rooms, /rooms/:hostelId
app.use('/bookings', bookingRoutes);  // /bookings, /bookings/:userId
app.use('/pay', payRoutes);           // /pay/initialize, /pay/verify
app.use('/notifications', notificationRoutes); // /notifications
app.use('/chat', chatRoutes);         // /chat, /chat/:hostelId
app.use('/waitlist', waitlistRoutes); // /waitlist/join, /waitlist/admin/:hostelId
app.use('/admin', adminRoutes);       // /admin/*

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 School Hostel System is LIVE!`);
    console.log(`🏠 Local:            http://localhost:${PORT}`);
    console.log(`📱 On your Network:  http://172.20.10.2:${PORT}\n`);
});

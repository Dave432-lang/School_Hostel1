const express = requirer( 'express');
const app = express();

const PORT = 5000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hostel Booking System API  is running...');
});

app.listen(PORT, () => {
    console.log('Server running on port ${PORT}');
});
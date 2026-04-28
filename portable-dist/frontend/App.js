async function loadHostels() {
    try {
        const response = await fetch('http://localhost:5000/hostels');
        const hostels = await response.json();

        const container = document.getElementById('hostels');

        container.innerHTML = '';

        hostels.forEach(hostel => {
            const div = document.createElement('div');

            div.innerHTML = `
                <h3>${hostel.name}</h3>
                <p>Type: ${hostel.type}</p>
                <button onclick="loadRooms(${hostel.id})">View Rooms</button>
                <div id="rooms-${hostel.id}"></div>
            `;

            container.appendChild(div);
        });

    } catch (error) {
        console.error(error);
    }
}

async function loadRooms(hostelId) {
    try {
        const response = await fetch(`http://localhost:5000/rooms/${hostelId}`);
        const rooms = await response.json();

        const container = document.getElementById(`rooms-${hostelId}`);

        container.innerHTML = '';

        rooms.forEach(room => {
            const div = document.createElement('div');

            div.innerHTML = `
                <p>${room.room_type} - Capacity: ${room.capacity}</p>
                <button onclick="bookRoom(${room.id})">Book Room</button>
            `;

            container.appendChild(div);
        });

    } catch (error) {
        console.error(error);
    }
}

let currentUserId = localStorage.getItem('user_id');

body: JSON.stringify({
    user_id: currentUserId,
    room_id: roomId
})


function logout() {
    localStorage.removeItem('user_id');
    alert("Logged out");
    window.location.href = 'login.html';
}
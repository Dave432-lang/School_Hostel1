# School Hostel Booking System - Project Documentation

## 1. Project Overview
The **School Hostel Booking System** is a full-stack web application designed to facilitate hostel reservations for students. It enables users to browse hostels, view rooms, make bookings, and handle payments. It also features administrative and managerial dashboards for system oversight, real-time chat, and notification capabilities.

### Tech Stack
- **Frontend**: HTML5, Vanilla CSS, JavaScript (Vanilla/ES6), Socket.IO client.
- **Backend**: Node.js, Express.js, Socket.IO.
- **Database**: PostgreSQL (pg).
- **Payment Integration**: Paystack (via `/pay` routes).

---

## 2. Database Schema
The system uses PostgreSQL. The core data models are defined in `database/schema.sql`.

### Tables
1. **`users`**
   - **Fields**: `id`, `first_name`, `last_name`, `student_id`, `programme`, `year_of_study`, `email`, `password`, `created_at`.
   - **Purpose**: Stores student and administrator credentials and profiles.
2. **`hostels`**
   - **Fields**: `id`, `name`, `location`, `description`, `type`, `gender`, `rating`, `amenities`, `image_urls`, `price_per_semester`, `created_at`.
   - **Purpose**: Represents hostel buildings/listings.
3. **`rooms`**
   - **Fields**: `id`, `hostel_id` (FK), `room_number`, `room_type`, `is_available`, `created_at`.
   - **Purpose**: Individual rooms belonging to a hostel.
4. **`bookings`**
   - **Fields**: `id`, `user_id` (FK), `room_id` (FK), `semester`, `agreed_to_terms`, `status` (*pending*, *confirmed*, *cancelled*), `created_at`.
   - **Purpose**: Tracks room reservations made by users.
5. **`reviews`**
   - **Fields**: `id`, `hostel_id` (FK), `user_name`, `rating`, `comment`, `created_at`.
   - **Purpose**: Student reviews for specific hostels.
6. **(Implied/Additional tables based on backend)**: Likely `notifications` and `waitlist` tables based on controller files.

---

## 3. Backend Architecture

The backend is built with Express.js and is initialized in `backend/app.js`.

### Entry Point (`backend/app.js`)
- Runs on **Port 5000**.
- Serves the `frontend` folder statically.
- Initializes **Socket.IO** for real-time functionalities (notifications/chat).

### Routing & Controllers
Endpoints are grouped logically and handled by corresponding controllers (`backend/controllers/`):

- **Auth Routes (`/`)**: Handled by `authController.js` (Login, Register, Get current user).
- **Hostel Routes (`/hostels`)**: Handled by `hostelController.js` (CRUD for hostels, listing, searching).
- **Room Routes (`/rooms`)**: Handled by `roomController.js` (Manage rooms within specific hostels).
- **Booking Routes (`/bookings`)**: Handled by `bookingController.js` (Create, manage, and view bookings).
- **Payment Routes (`/pay`)**: Interfaces with Paystack for booking payments (`initialize`, `verify`).
- **Chat Routes (`/chat`)**: Handled by `chatController.js` (Real-time messages between users/admins).
- **Notification Routes (`/notifications`)**: Handled by `notificationController.js` (System alerts for users).
- **Waitlist Routes (`/waitlist`)**: Handled by `waitlistController.js` (Join a waitlist for fully-booked hostels).
- **Admin Routes (`/admin`)**: Handled by `adminController.js` (Analytics, public stats, user management).

### Models (`backend/models/`)
Contains data access logic interacting with PostgreSQL:
- `User.js`
- `Hostel.js`
- `Room.js`
- `Booking.js`

---

## 4. Frontend Architecture

The frontend is predominantly plain HTML, CSS, and JS using an API-driven Single Page Application (SPA) or Multi-Page Application approach.

### Root Files
- **`index.html`**: The main landing page.
- **`login.html`**: User authentication interface.
- **`App.js`**: Core frontend initialization.

### Pages (`frontend/pages/`)
Dedicated HTML files for different views:
- **`hostel-list.html`**: Catalog of available hostels.
- **`hostel-map.html`**: Visual map orientation of hostel locations.
- **`dashboard.html`**: Interface for students to view their profile and notifications.
- **`booking-history.html`**: Shows a student's past and current bookings.
- **`admin.html`**: Dashboard for system-wide administrators.
- **`manager-dashboard.html`**: Dashboard for specific hostel managers.

### Scripts (`frontend/js/`)
Modular scripts powering the frontend logic:
- **`api.js`**: Centralized wrapper for making API calls to `localhost:5000`.
- **`auth.js`**: Handles JWT tokens, login, and registration logic.
- **`app.js`**: Generic UI interactions, modal handling, global state.
- **`hostels.js`**: Fetches and renders the hostel lists and details.
- **`booking.js`**: Logic for room selection and the checkout/payment flow.
- **`admin.js` / `manager.js`**: Power the stats and management tables on admin dashboards.
- **`chat.js`**: Client-side Socket.IO logic for real-time messaging.
- **`weather.js`**: Likely an external API integration to show weather forecasts for hostel locations.
- **`dashboard.js`**: Powers the user dashboard view.

---

## 5. Key Features & Workflows
1. **Authentication**: Users register, receive a JWT token, and their sessions are managed via `auth.js`.
2. **Browsing & Searching**: Students can view lists and a map of hostels.
3. **Booking & Payment**: Selecting a room triggers a booking creation. Users can pay via card (Paystack) which changes the booking status from *pending* to *confirmed*.
4. **Real-Time Communications**: Chat feature and Notifications are powered by Socket.IO, enhancing student-admin communication.
5. **Dashboards**: Separate administrative views give operators metrics on revenue, occupancy, and users.

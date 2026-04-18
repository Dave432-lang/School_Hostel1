# School Hostel Booking System

A premium hostel booking and management system built with Node.js, MySQL (XAMPP), and Vanilla JavaScript.

## 🚀 Setup Instructions (Local XAMPP)

Follow these steps to get the project running on your local machine:

### 1. Database Setup
1. Open the **XAMPP Control Panel** and start **Apache** and **MySQL**.
2. Click the **Admin** button next to MySQL to open **phpMyAdmin** (or go to `http://localhost/phpmyadmin`).
3. Create a new database named `school_hostel`.
4. Select the `school_hostel` database, click the **Import** tab, and upload the `backend/database_setup_mysql.sql` file.

### 2. Backend Setup
1. Open your terminal in the `backend` folder.
2. Create a `.env` file by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your database credentials (default MySQL user is usually `root` with no password).
4. Install dependencies and start the server:
   ```bash
   npm install
   node app.js
   ```

### 3. Frontend Hosting
1. Copy the entire project folder into your XAMPP's `htdocs` directory (e.g., `C:\xampp\htdocs\School_Hostel1`).
2. Open your browser and navigate to:
   `http://localhost/School_Hostel1/frontend/index.html`

## 🛠️ Troubleshooting
- **Failed to Fetch:** Ensure the Node.js backend is running on port 5000.
- **Port Conflict:** If port 5000 is in use, change the `PORT` in `backend/app.js` and update `frontend/js/api.js`.

## 🔒 Security
- Default Admin Email: `executive@school.edu.gh`
- Default Admin Password: `admin123`

# School Hostel Booking System — Portable Launcher

This folder contains everything you need to run the hostel system locally without installing Node.js.

## 🚀 Easy Setup

### 1. Database (Only needed once)
1. Open **XAMPP** and start **MySQL**.
2. Go to `http://localhost/phpmyadmin` and create a database named `school_hostel`.
3. Import the `database_setup_mysql.sql` file provided in this folder.

### 2. Run the System
1. Double-click the **`hostel-system.exe`** file.
2. A terminal window will open. Leave it open while using the system.
3. Open your web browser and go to:
   **`http://localhost:5000`**

---

### 🛠️ Troubleshooting
- **Failed to Connect?** Ensure MySQL is started in XAMPP.
- **Port 5000 occupied?** You can change the port in the `.env` file and restart the `.exe`.
- **UI Changes:** You can edit the HTML/CSS in the `frontend/` folder directly, and they will update when you refresh the browser!

### 🔒 Login Credentials
- **Admin:** `executive@school.edu.gh` / `admin123`
- **Student:** `student@example.com` / `password123` (or register a new one)

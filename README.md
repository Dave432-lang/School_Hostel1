# School Hostel Booking System

A premium hostel booking and management system built with Node.js, MySQL (XAMPP), and Vanilla JavaScript.

## 🚀 Setup Instructions

### Option 1: Quick Way (No Installation Required)
1.  **Download** the `portable-dist` folder from the repository.
2.  **Start MySQL** in your XAMPP Control Panel.
3.  **Import** `database_setup_mysql.sql` (found in the folder) into phpMyAdmin.
4.  **Double-click** `hostel-system.exe` inside the folder.
5.  Open **[http://localhost:5000](http://localhost:5000)** in your browser.

### Option 2: Developer Mode (Running from Source)
1.  **Clone the Repository:** `git clone https://github.com/Dave432-lang/School_Hostel1.git`
2.  **Import Database:** Import `backend/database_setup_mysql.sql` into XAMPP MySQL.
3.  **Backend Setup:**
    - Navigate to the `backend` folder.
    - Run `npm install` then `node app.js`.
4.  **Frontend Hosting:**
    - Place the project in your XAMPP `htdocs` folder.
    - Open `http://localhost/School_Hostel1/frontend/index.html` in your browser.

---

## 🔒 Default Login Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `executive@school.edu.gh` | `admin123` |
| **Student** | `student@example.com` | `password123` |

---

## 🛠️ Features
- **Modern UI:** Responsive design for all devices.
- **Real-time Chat:** Integrated support chat for hostels.
- **Analytics:** Visual data for managers and admins.
- **Safe Payments:** Paystack integration ready (Test Mode).
- **Portable:** Standalone Windows executable for easy deployment.

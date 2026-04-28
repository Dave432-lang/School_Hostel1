-- MySQL Database Setup for School Hostel Booking System
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Create Database
DROP DATABASE IF EXISTS `school_hostel`;
CREATE DATABASE `school_hostel` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `school_hostel`;

-- Table structure for `users`
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) DEFAULT NULL,
  `email` varchar(150) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) DEFAULT 'student', -- admin, manager, student
  `student_id` varchar(50) DEFAULT NULL,
  `programme` varchar(150) DEFAULT NULL,
  `year_of_study` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for `hostels`
DROP TABLE IF EXISTS `hostels`;
CREATE TABLE `hostels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `type` varchar(50) DEFAULT 'standard', -- premium, standard, executive
  `gender` varchar(50) DEFAULT 'mixed', -- male, female, mixed
  `price_per_semester` decimal(10,2) DEFAULT '2000.00',
  `rating` decimal(3,1) DEFAULT '0.0',
  `amenities` json DEFAULT NULL,
  `image_urls` json DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `manager_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `manager_id` (`manager_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for `rooms`
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hostel_id` int(11) NOT NULL,
  `room_number` varchar(50) NOT NULL,
  `room_type` varchar(50) DEFAULT 'single',
  `capacity` int(11) DEFAULT '1',
  `is_available` boolean DEFAULT TRUE,
  PRIMARY KEY (`id`),
  KEY `hostel_id` (`hostel_id`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for `bookings`
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `status` varchar(20) DEFAULT 'confirmed', -- confirmed, cancelled
  `payment_reference` varchar(100) DEFAULT NULL,
  `payment_status` varchar(20) DEFAULT 'unpaid', -- paid, unpaid
  `amount_paid` decimal(10,2) DEFAULT '0.00',
  `semester` varchar(50) DEFAULT NULL,
  `agreed_to_terms` boolean DEFAULT FALSE,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for `reviews`
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hostel_id` int(11) NOT NULL,
  `user_name` varchar(150) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hostel_id` (`hostel_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for `notifications`
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` varchar(50) DEFAULT 'info',
  `message` text NOT NULL,
  `is_read` boolean DEFAULT FALSE,
  `target_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for `chat`
DROP TABLE IF EXISTS `chat`;
CREATE TABLE `chat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hostel_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hostel_id` (`hostel_id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  CONSTRAINT `chat_ibfk_1` FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_ibfk_3` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for `waitlist`
DROP TABLE IF EXISTS `waitlist`;
CREATE TABLE `waitlist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hostel_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hostel_id` (`hostel_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `waitlist_ibfk_1` FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `waitlist_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Admin User (Password: admin123)
INSERT INTO `users` (`first_name`, `last_name`, `email`, `password`, `role`) 
VALUES ('System', 'Admin', 'executive@school.edu.gh', '$2a$10$FFUjRIeY7iViDymkw0vddOpSXjQKL6oEfY1UePDelsA9h2MzuCDSS', 'admin');

-- Seed Student User (Password: password123)
INSERT INTO `users` (`first_name`, `last_name`, `email`, `password`, `role`, `student_id`, `programme`, `year_of_study`) 
VALUES ('Sample', 'Student', 'student@example.com', '$2a$10$56z.R331mhonmCWYLu/or.DfIIWnmK7EewhEfpq4V1Aj3DJUfmsQK', 'student', '12345678', 'Computer Science', 'Year 2');

-- Seed Sample Hostels
INSERT INTO `hostels` (`name`, `location`, `description`, `type`, `gender`, `price_per_semester`, `rating`, `amenities`, `image_urls`, `latitude`, `longitude`) 
VALUES 
('Crystal Rose Hostel', 'Ayeduase', 'Premium private hostel with top-notch security.', 'premium', 'mixed', 4500.00, 4.8, '["Wi-Fi", "AC", "Shuttle", "Study Room", "Security"]', '{"rooms": ["../src/assets/images/PIC/H1.jpg"], "washrooms": [], "kitchens": []}', 5.660534, -0.204937),
('Evandy Hostel', 'Bomso', 'Affordable traditional setting off-campus.', 'standard', 'mixed', 2800.00, 4.0, '["Study Room", "Water Supply", "Security"]', '{"rooms": ["../src/assets/images/PIC/H2.jpg"], "washrooms": [], "kitchens": []}', 5.652006, -0.187985),
('The Penthouse', 'Campus Gate', 'Luxurious student living with private balcony.', 'executive', 'mixed', 5500.00, 4.9, '["Smart Lock", "Infinity Pool", "Gym", "Private Kitchen"]', '{"rooms": ["../src/assets/images/PIC/H3.jpg"], "washrooms": [], "kitchens": []}', 5.650097, -0.188265),
('Queen Elizabeth Hall', 'Main Campus', 'Female-only residence with strict discipline.', 'standard', 'female', 1800.00, 4.2, '["24/7 Security", "Reading Hall", "Cafeteria"]', '{"rooms": ["../src/assets/images/PIC/H4.jpg"], "washrooms": [], "kitchens": []}', 5.643124, -0.204531),
('Unity Hall (Conti)', 'Main Campus', 'One of the most vibrant male halls on campus.', 'standard', 'male', 1500.00, 3.8, '["Table Tennis", "Basketball Court", "Barber Shop"]', '{"rooms": ["../src/assets/images/PIC/H5.jpg"], "washrooms": [], "kitchens": []}', 5.651022, -0.200990),
('Gaza Strip Hostel', 'Kotei', 'Lively environment popular with final year students.', 'standard', 'mixed', 2200.00, 3.5, '["Lush Garden", "Shared Kitchen", "Storage"]', '{"rooms": ["../src/assets/images/PIC/H6.jpg"], "washrooms": [], "kitchens": []}', 5.657766, -0.204083),
('Hollywood Hostel', 'Ayeduase Extension', 'Modern architecture with spacious study environments.', 'premium', 'female', 4800.00, 4.7, '["Backup Generator", "Solar Power", "Elevator"]', '{"rooms": ["../src/assets/images/PIC/H7.jpg"], "washrooms": [], "kitchens": []}', 5.659848, -0.205463),
('Flints Hostel', 'New Site', 'Quiet and serene, ideal for engineering students.', 'standard', 'mixed', 3200.00, 4.1, '["Fiber Internet", "Indoor Games", "Laundry"]', '{"rooms": ["../src/assets/images/PIC/H8.jpg"], "washrooms": [], "kitchens": []}', 5.641314, -0.199547),
('Frontline Hostel', 'Bomso Corner', 'Direct access to the main road and shuttle stops.', 'executive', 'male', 5200.00, 4.6, '["Private Lounge", "Mini Mart", "Pharmacy"]', '{"rooms": ["../src/assets/images/PIC/H9.jpg"], "washrooms": [], "kitchens": []}', 5.643908, -0.202625),
('Silicon Valley Hall', 'Tech Junction', 'High-tech hostel with smart features and co-working spaces.', 'premium', 'mixed', 5000.00, 5.0, '["Co-working Space", "Podcasting Studio", "Gaming Room"]', '{"rooms": ["../src/assets/images/PIC/H10.jpg"], "washrooms": [], "kitchens": []}', 5.653452, -0.191519),
('Ahenema Hostel', 'Kotei Road', 'Traditional hospitality with modern comfort.', 'standard', 'mixed', 2600.00, 3.9, '["Summer Hut", "BBQ Area", "Parking"]', '{"rooms": ["../src/assets/images/PIC/H11.jpg"], "washrooms": [], "kitchens": []}', 5.654445, -0.188857),
('Excellence Towers', 'Ayeduase South', 'The tallest hostel in the region with sky views.', 'executive', 'female', 6000.00, 4.9, '["Rooftop Restaurant", "Spa", "Beauty Salon"]', '{"rooms": ["../src/assets/images/PIC/H12.jpg"], "washrooms": [], "kitchens": []}', 5.656722, -0.204885);

-- Seed Sample Rooms
INSERT INTO `rooms` (`hostel_id`, `room_number`, `room_type`, `capacity`, `is_available`) 
VALUES 
(1, '101A', 'Single', 1, 1), (1, '101B', 'Single', 1, 1), (1, '202', 'Double', 2, 1),
(2, 'A1', '4-in-a-room', 4, 1), (2, 'A2', '4-in-a-room', 4, 1),
(3, 'PH1', 'Executive', 1, 1), (3, 'PH2', 'Executive', 1, 1),
(4, 'QE20', 'Double', 2, 1), (4, 'QE21', 'Single', 1, 1),
(5, 'U44', 'Triple', 3, 1), (5, 'U45', 'Triple', 3, 1),
(6, 'GS5', 'Single', 1, 1),
(7, 'H01', 'Premium', 1, 1), (7, 'H02', 'Premium', 1, 1),
(8, 'F12', 'Double', 2, 1),
(9, 'FL-01', 'Executive', 1, 1),
(10, 'SV-1', 'Smart Single', 1, 1), (10, 'SV-2', 'Smart Double', 2, 1),
(11, 'AH-10', 'Standard', 2, 1),
(12, 'ET-01', 'Grand Executive', 1, 1);

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

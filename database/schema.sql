-- ============================================================
-- School Hostel Booking System — Database Schema
-- Database: PostgreSQL  |  DB Name: school_hostel1
-- ============================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  first_name VARCHAR(150) NOT NULL,
  last_name  VARCHAR(150),
  student_id VARCHAR(50),
  programme  VARCHAR(150),
  year_of_study VARCHAR(20),
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(20)  DEFAULT 'student',
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Hostels Table
CREATE TABLE IF NOT EXISTS hostels (
  id                 SERIAL PRIMARY KEY,
  name               VARCHAR(200)   NOT NULL,
  location           VARCHAR(255),
  description        TEXT,
  type               VARCHAR(50)    DEFAULT 'standard',
  gender             VARCHAR(10)    DEFAULT 'mixed',
  rating             NUMERIC(3, 1)  DEFAULT 0.0,
  amenities          JSONB          DEFAULT '[]',
  image_urls         JSONB          DEFAULT '{"rooms":[],"washrooms":[],"kitchens":[]}',
  price_per_semester NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id           SERIAL PRIMARY KEY,
  hostel_id    INT         NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number  VARCHAR(20) NOT NULL,
  room_type    VARCHAR(20) NOT NULL DEFAULT 'single',
  is_available BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE (hostel_id, room_number)
);

-- Bookings Table (simple — only user_id + room_id required)
CREATE TABLE IF NOT EXISTS bookings (
  id         SERIAL PRIMARY KEY,
  user_id    INT  NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  room_id    INT  REFERENCES rooms(id)           ON DELETE SET NULL,
  semester   VARCHAR(50),
  agreed_to_terms BOOLEAN        DEFAULT FALSE,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_hostel_id  ON rooms(hostel_id);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  hostel_id  INT  NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  user_name  VARCHAR(150) NOT NULL,
  rating     INT  CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

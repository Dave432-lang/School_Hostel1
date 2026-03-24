-- ============================================================
-- School Hostel Booking System — Full Database Schema
-- Database: PostgreSQL
-- ============================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Hostels Table
CREATE TABLE IF NOT EXISTS hostels (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(200)   NOT NULL,
  location            VARCHAR(255),
  description         TEXT,
  type                VARCHAR(50)    DEFAULT 'standard' CHECK (type IN ('standard', 'premium', 'executive')),
  gender              VARCHAR(10)    DEFAULT 'mixed'    CHECK (gender IN ('male', 'female', 'mixed')),
  price_per_semester  NUMERIC(10, 2) NOT NULL,
  created_at          TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id            SERIAL PRIMARY KEY,
  hostel_id     INT            NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number   VARCHAR(20)    NOT NULL,
  room_type     VARCHAR(20)    NOT NULL CHECK (room_type IN ('single', 'double', 'triple')),
  is_available  BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP      NOT NULL DEFAULT NOW(),
  UNIQUE (hostel_id, room_number)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id            SERIAL PRIMARY KEY,
  user_id       INT          NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  hostel_id     INT          NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id       INT          REFERENCES rooms(id)            ON DELETE SET NULL,
  room_type     VARCHAR(20)  NOT NULL,
  semester      VARCHAR(50)  NOT NULL,
  academic_year VARCHAR(20)  NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id   ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_hostel_id ON bookings(hostel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_hostel_id    ON rooms(hostel_id);

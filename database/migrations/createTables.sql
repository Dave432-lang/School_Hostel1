-- ============================================================
-- Migration: Create All Tables
-- Run this script to initialise the database.
-- ============================================================

\i schema.sql

-- ============================================================
-- Seed Data: Sample hostels and rooms
-- ============================================================

-- Hostels
INSERT INTO hostels (name, location, description, type, gender, price_per_semester) VALUES
  ('Akwaba Hall',      'Block A, Main Campus', 'Comfortable standard rooms near the library.',      'standard',  'female', 950.00),
  ('Kotoka House',     'Block B, Main Campus', 'Premium hostel with ensuite bathrooms.',             'premium',   'male',   1400.00),
  ('Unity Lodge',      'Off-Campus, 200m away', 'Mixed hostel with affordable shared rooms.',        'standard',  'mixed',  800.00),
  ('Executive Suites', 'Block C, Main Campus', 'Top-tier executive rooms with full facilities.',    'executive', 'mixed',  2200.00),
  ('Sankofa Hostel',   'Block D, Main Campus', 'Male-only hostel with 24/7 security.',              'standard',  'male',   900.00)
ON CONFLICT DO NOTHING;

-- Rooms for Akwaba Hall (id=1)
INSERT INTO rooms (hostel_id, room_number, room_type, is_available) VALUES
  (1, 'A101', 'single', TRUE),
  (1, 'A102', 'single', TRUE),
  (1, 'A103', 'double', TRUE),
  (1, 'A104', 'double', TRUE),
  (1, 'A105', 'triple', TRUE)
ON CONFLICT DO NOTHING;

-- Rooms for Kotoka House (id=2)
INSERT INTO rooms (hostel_id, room_number, room_type, is_available) VALUES
  (2, 'K201', 'single', TRUE),
  (2, 'K202', 'single', TRUE),
  (2, 'K203', 'double', TRUE),
  (2, 'K204', 'double', FALSE)
ON CONFLICT DO NOTHING;

-- Rooms for Unity Lodge (id=3)
INSERT INTO rooms (hostel_id, room_number, room_type, is_available) VALUES
  (3, 'U301', 'single', TRUE),
  (3, 'U302', 'double', TRUE),
  (3, 'U303', 'triple', TRUE)
ON CONFLICT DO NOTHING;

-- Rooms for Executive Suites (id=4)
INSERT INTO rooms (hostel_id, room_number, room_type, is_available) VALUES
  (4, 'E401', 'single', TRUE),
  (4, 'E402', 'single', TRUE)
ON CONFLICT DO NOTHING;

-- Rooms for Sankofa Hostel (id=5)
INSERT INTO rooms (hostel_id, room_number, room_type, is_available) VALUES
  (5, 'S501', 'single', TRUE),
  (5, 'S502', 'double', TRUE),
  (5, 'S503', 'triple', TRUE)
ON CONFLICT DO NOTHING;

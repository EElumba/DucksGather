-- ============================================================================
-- DucksGather Sample Data
-- ============================================================================
-- This script inserts sample data for testing the DucksGather application
-- Run this AFTER running schema.sql
-- ============================================================================

-- ============================================================================
-- SAMPLE ORGANIZATIONS
-- ============================================================================
INSERT INTO organizations (name, description, contact_email, website_url)
VALUES 
    ('Computer Science Club', 'Student organization for CS majors and enthusiasts', 'csclub@uoregon.edu', 'https://csclub.uoregon.edu'),
    ('Campus Events Office', 'Official UO campus events coordination', 'events@uoregon.edu', 'https://events.uoregon.edu'),
    ('Student Union', 'EMU student programs and activities', 'emu@uoregon.edu', 'https://emu.uoregon.edu'),
    ('Duck Athletics', 'UO Sports and Recreation', 'athletics@uoregon.edu', 'https://goducks.com'),
    ('Asian Student Union', 'Celebrating and promoting Asian cultures at UO', 'asu@uoregon.edu', 'https://asu.uoregon.edu'),
    ('Environmental Leadership Program', 'Promoting sustainability on campus', 'elp@uoregon.edu', 'https://elp.uoregon.edu'),
    ('ASUO', 'Associated Students of the University of Oregon', 'asuo@uoregon.edu', 'https://asuo.uoregon.edu')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SAMPLE LOCATIONS
-- ============================================================================
INSERT INTO locations (building_name, room_number, address, latitude, longitude)
VALUES 
    ('Deschutes Hall', '117', '1420 Agate St, Eugene, OR 97403', 44.0445, -123.0759),
    ('Erb Memorial Union', '202', '1395 University St, Eugene, OR 97403', 44.0448, -123.0782),
    ('Erb Memorial Union', 'Ballroom', '1395 University St, Eugene, OR 97403', 44.0448, -123.0782),
    ('Knight Library', 'Main Floor', '1299 University St, Eugene, OR 97403', 44.0443, -123.0765),
    ('Matthew Knight Arena', 'Concourse', '1385 E 13th Ave, Eugene, OR 97403', 44.0426, -123.0726),
    ('Lillis Business Complex', '175', '1208 University St, Eugene, OR 97403', 44.0450, -123.0770),
    ('Pacific Hall', 'Auditorium', '1585 E 13th Ave, Eugene, OR 97403', 44.0440, -123.0712),
    ('Student Recreation Center', 'Main Gym', '1601 University St, Eugene, OR 97403', 44.0462, -123.0740),
    ('Jordan Schnitzer Museum of Art', 'Gallery', '1430 Johnson Ln, Eugene, OR 97403', 44.0456, -123.0742),
    ('Allen Hall', '123', '1232 University St, Eugene, OR 97403', 44.0451, -123.0763)
ON CONFLICT (building_name, room_number) DO NOTHING;

-- ============================================================================
-- SAMPLE EVENTS
-- ============================================================================
-- Note: You'll need to replace organization_id and location_id with actual IDs
-- This query gets the IDs dynamically
INSERT INTO events (title, description, category, date, start_time, end_time, organization_id, location_id, is_scraped)
VALUES 
    (
        'Intro to Machine Learning Workshop',
        'Learn the basics of ML with hands-on coding examples using Python and scikit-learn. Perfect for beginners!',
        'Academic',
        CURRENT_DATE + INTERVAL '5 days',
        '14:00:00',
        '16:00:00',
        (SELECT organization_id FROM organizations WHERE name = 'Computer Science Club'),
        (SELECT location_id FROM locations WHERE building_name = 'Deschutes Hall' AND room_number = '117'),
        false
    ),
    (
        'Fall Career Fair',
        'Meet with top employers from tech, business, and government sectors. Bring your resume!',
        'Career',
        CURRENT_DATE + INTERVAL '10 days',
        '10:00:00',
        '15:00:00',
        (SELECT organization_id FROM organizations WHERE name = 'Campus Events Office'),
        (SELECT location_id FROM locations WHERE building_name = 'Erb Memorial Union' AND room_number = 'Ballroom'),
        false
    ),
    (
        'Ducks vs Beavers Basketball',
        'Catch the rivalry game! Student section tickets available.',
        'Sports',
        CURRENT_DATE + INTERVAL '7 days',
        '19:00:00',
        '21:00:00',
        (SELECT organization_id FROM organizations WHERE name = 'Duck Athletics'),
        (SELECT location_id FROM locations WHERE building_name = 'Matthew Knight Arena'),
        false
    ),
    (
        'Mid-Autumn Festival Celebration',
        'Join us for mooncakes, performances, and cultural activities celebrating the Mid-Autumn Festival.',
        'Cultural',
        CURRENT_DATE + INTERVAL '3 days',
        '17:00:00',
        '20:00:00',
        (SELECT organization_id FROM organizations WHERE name = 'Asian Student Union'),
        (SELECT location_id FROM locations WHERE building_name = 'Erb Memorial Union' AND room_number = '202'),
        false
    ),
    (
        'Campus Sustainability Forum',
        'Discuss UO''s carbon neutrality goals and student-led initiatives. Pizza provided!',
        'Environmental',
        CURRENT_DATE + INTERVAL '4 days',
        '18:00:00',
        '19:30:00',
        (SELECT organization_id FROM organizations WHERE name = 'Environmental Leadership Program'),
        (SELECT location_id FROM locations WHERE building_name = 'Lillis Business Complex' AND room_number = '175'),
        false
    ),
    (
        'Late Night Study Session',
        'Free coffee and snacks while you study for midterms. Quiet study areas available.',
        'Academic',
        CURRENT_DATE + INTERVAL '2 days',
        '21:00:00',
        '23:59:00',
        (SELECT organization_id FROM organizations WHERE name = 'Student Union'),
        (SELECT location_id FROM locations WHERE building_name = 'Knight Library' AND room_number = 'Main Floor'),
        false
    ),
    (
        'Student Government Town Hall',
        'Voice your concerns and ideas directly to ASUO representatives. Your opinion matters!',
        'Social',
        CURRENT_DATE + INTERVAL '8 days',
        '16:00:00',
        '17:30:00',
        (SELECT organization_id FROM organizations WHERE name = 'ASUO'),
        (SELECT location_id FROM locations WHERE building_name = 'Erb Memorial Union' AND room_number = '202'),
        false
    ),
    (
        'Contemporary Art Exhibition Opening',
        'Opening reception for new exhibition featuring Pacific Northwest artists.',
        'Arts',
        CURRENT_DATE + INTERVAL '6 days',
        '17:00:00',
        '19:00:00',
        (SELECT organization_id FROM organizations WHERE name = 'Campus Events Office'),
        (SELECT location_id FROM locations WHERE building_name = 'Jordan Schnitzer Museum of Art' AND room_number = 'Gallery'),
        false
    );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify your data was inserted correctly

-- Check organizations
-- SELECT * FROM organizations;

-- Check locations
-- SELECT * FROM locations;

-- Check events with joined data
-- SELECT 
--     e.title,
--     e.date,
--     e.category,
--     o.name as organization,
--     l.building_name,
--     l.room_number
-- FROM events e
-- LEFT JOIN organizations o ON e.organization_id = o.organization_id
-- LEFT JOIN locations l ON e.location_id = l.location_id
-- ORDER BY e.date;

-- ============================================================================
-- SAMPLE DATA INSERTION COMPLETE!
-- ============================================================================

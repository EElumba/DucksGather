-- ============================================================================
-- DucksGather Database Schema for Supabase (PostgreSQL)
-- ============================================================================
-- This script creates all tables needed for the DucksGather event management system
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New Query
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATIONS TABLE
-- ============================================================================
-- Stores information about event organizing groups (CS Club, Student Union, etc.)
CREATE TABLE IF NOT EXISTS organizations (
    organization_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    contact_email VARCHAR(255),
    website_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. LOCATIONS TABLE (3NF Compliant)
-- ============================================================================
-- Stores reusable location data for campus buildings and rooms
CREATE TABLE IF NOT EXISTS locations (
    location_id SERIAL PRIMARY KEY,
    building_name VARCHAR(255) NOT NULL,
    room_number VARCHAR(50),
    address VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_name, room_number)
);

-- ============================================================================
-- 3. USERS TABLE
-- ============================================================================
-- Extends Supabase auth.users with additional profile information
-- Links to auth.users table for authentication
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'coordinator', 'admin')),
    major VARCHAR(255),
    preferences JSONB,  -- Stores user preferences like favorite categories, majors
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. EVENTS TABLE
-- ============================================================================
-- Main events table storing all event information
CREATE TABLE IF NOT EXISTS events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,  -- e.g., 'Academic', 'Social', 'Sports', 'Arts'
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    image_url VARCHAR(500),  -- URL to event poster/image in Supabase Storage
    external_url VARCHAR(500),  -- Link to external event page
    organization_id INTEGER REFERENCES organizations(organization_id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(location_id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    is_scraped BOOLEAN DEFAULT FALSE,  -- TRUE if event was web-scraped
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints to ensure data integrity
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_date CHECK (date >= CURRENT_DATE)
);

-- ============================================================================
-- 5. IMAGES TABLE
-- ============================================================================
-- Stores image metadata for events and organizations
CREATE TABLE IF NOT EXISTS images (
    image_id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(organization_id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_size INTEGER,  -- Size in bytes
    mime_type VARCHAR(100),  -- e.g., 'image/png', 'image/jpeg'
    -- Constraint: image must belong to either an event OR an organization, not both
    CONSTRAINT event_or_org CHECK (
        (event_id IS NOT NULL AND organization_id IS NULL) OR 
        (event_id IS NULL AND organization_id IS NOT NULL)
    )
);

-- ============================================================================
-- 6. USER_EVENTS TABLE (Junction Table)
-- ============================================================================
-- Many-to-many relationship: tracks which events users are attending/saved
CREATE TABLE IF NOT EXISTS user_events (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reminder_sent BOOLEAN DEFAULT FALSE,  -- Track if email reminder was sent
    PRIMARY KEY (user_id, event_id)
);

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================
-- Create indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_organization ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_id);
CREATE INDEX IF NOT EXISTS idx_user_events_user ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event ON user_events(event_id);

-- ============================================================================
-- 8. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================
-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with 'updated_at' column
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables for security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read organizations
CREATE POLICY "Organizations are viewable by everyone" 
    ON organizations FOR SELECT 
    USING (true);

-- Policy: Anyone can read locations
CREATE POLICY "Locations are viewable by everyone" 
    ON locations FOR SELECT 
    USING (true);

-- Policy: Users can read their own profile
CREATE POLICY "Users can view their own profile" 
    ON users FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Anyone can read events
CREATE POLICY "Events are viewable by everyone" 
    ON events FOR SELECT 
    USING (true);

-- Policy: Authenticated users can create events
CREATE POLICY "Authenticated users can create events" 
    ON events FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own events
CREATE POLICY "Users can update their own events" 
    ON events FOR UPDATE 
    USING (auth.uid() = created_by);

-- Policy: Users can delete their own events, or admins can delete any
CREATE POLICY "Users can delete their own events" 
    ON events FOR DELETE 
    USING (auth.uid() = created_by);

-- Policy: Anyone can view images
CREATE POLICY "Images are viewable by everyone" 
    ON images FOR SELECT 
    USING (true);

-- Policy: Users can manage their own saved events
CREATE POLICY "Users can manage their own saved events" 
    ON user_events FOR ALL 
    USING (auth.uid() = user_id);

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Next step: Run the sample data script below (optional) or start using the API
-- ============================================================================

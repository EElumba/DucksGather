import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
# Supabase provides a PostgreSQL connection string
# Fetch variables

USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

#DATABASE_URL = os.getenv("DATABASE_URL")



# Construct the SQLAlchemy connection string
DATABASE_URL = f"postgresql+psycopg2://{USER}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}?sslmode=require"


# If DATABASE_URL is not set, construct it from Supabase credentials
if not DATABASE_URL:
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD", "")
    
    if SUPABASE_URL and SUPABASE_DB_PASSWORD:
        # Extract project reference from Supabase URL
        # Format: https://xxxxx.supabase.co
        project_ref = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "")
        DATABASE_URL = f"postgresql://postgres:{SUPABASE_DB_PASSWORD}@db.{project_ref}.supabase.co:5432/postgres"

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL) if DATABASE_URL else None

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None

# Create base class for models
Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.
    Use this in Flask routes to get a database session.
    
    Usage:
        db = get_db()
        try:
            # Your database operations
            db.commit()
        except Exception as e:
            db.rollback()
            raise
        finally:
            db.close()
    """
    if SessionLocal is None:
        raise ValueError("Database connection not configured. Check your .env file.")
    
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise


def create_tables():
    """
    Creates all necessary tables for DucksGather application using SQLAlchemy.
    This executes raw SQL for initial setup including triggers and constraints.
    """
    
    if engine is None:
        print("❌ Error: Database connection not configured.")
        print("Please set DATABASE_URL in your .env file.")
        return False
    
    # SQL statements for table creation
    sql_statements = [
        # Organizations table
        """
        CREATE TABLE IF NOT EXISTS organizations (
            organization_id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            contact_email VARCHAR(255),
            website_url VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        
        # Locations table (3NF compliant - reusable locations)
        """
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
        """,
        
        # Users table (extends Supabase auth.users)
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL UNIQUE,
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'coordinator', 'admin')),
            major VARCHAR(255),
            preferences JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        
        # Events table
        """
        CREATE TABLE IF NOT EXISTS events (
            event_id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            category VARCHAR(100) NOT NULL,
            date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            image_url VARCHAR(500),
            external_url VARCHAR(500),
            organization_id INTEGER REFERENCES organizations(organization_id) ON DELETE SET NULL,
            location_id INTEGER REFERENCES locations(location_id) ON DELETE SET NULL,
            created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
            is_scraped BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT valid_time_range CHECK (end_time > start_time),
            CONSTRAINT valid_date CHECK (date >= CURRENT_DATE)
        );
        """,
        
        # Images table
        """
        CREATE TABLE IF NOT EXISTS images (
            image_id SERIAL PRIMARY KEY,
            event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
            organization_id INTEGER REFERENCES organizations(organization_id) ON DELETE CASCADE,
            image_url VARCHAR(500) NOT NULL,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            file_size INTEGER,
            mime_type VARCHAR(100),
            CONSTRAINT event_or_org CHECK (
                (event_id IS NOT NULL AND organization_id IS NULL) OR 
                (event_id IS NULL AND organization_id IS NOT NULL)
            )
        );
        """,
        
        # User_Events junction table (many-to-many: users attending events)
        """
        CREATE TABLE IF NOT EXISTS user_events (
            user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
            event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
            saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reminder_sent BOOLEAN DEFAULT FALSE,
            PRIMARY KEY (user_id, event_id)
        );
        """,
        
        # Create indexes for better query performance
        """
        CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_events_organization ON events(organization_id);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_id);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_user_events_user ON user_events(user_id);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_user_events_event ON user_events(event_id);
        """,
        
        # Create updated_at trigger function
        """
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        """,
        
        # Apply triggers to tables with updated_at
        """
        DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
        CREATE TRIGGER update_organizations_updated_at 
            BEFORE UPDATE ON organizations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """,
        """
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """,
        """
        DROP TRIGGER IF EXISTS update_events_updated_at ON events;
        CREATE TRIGGER update_events_updated_at 
            BEFORE UPDATE ON events
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
    ]
    
    try:
        with engine.connect() as connection:
            print("🔄 Creating database tables...")
            
            for i, statement in enumerate(sql_statements, 1):
                try:
                    connection.execute(text(statement))
                    connection.commit()
                except SQLAlchemyError as e:
                    print(f"⚠️  Statement {i} warning: {str(e)}")
                    continue
            
            print("✅ Database tables created successfully!")
            return True
            
    except SQLAlchemyError as e:
        print(f"❌ Error creating tables: {str(e)}")
        return False


def insert_sample_data():
    """
    Inserts sample data for testing purposes using SQLAlchemy.
    """
    
    if engine is None:
        print("❌ Error: Database connection not configured.")
        return False
    
    sample_sql = [
        # Sample organizations
        """
        INSERT INTO organizations (name, description, contact_email, website_url)
        VALUES 
            ('Computer Science Club', 'Student organization for CS majors and enthusiasts', 'csclub@uoregon.edu', 'https://csclub.uoregon.edu'),
            ('Campus Events Office', 'Official UO campus events coordination', 'events@uoregon.edu', 'https://events.uoregon.edu'),
            ('Student Union', 'EMU student programs and activities', 'emu@uoregon.edu', 'https://emu.uoregon.edu'),
            ('Duck Athletics', 'UO Sports and Recreation', 'athletics@uoregon.edu', 'https://goducks.com'),
            ('Asian Student Union', 'Celebrating and promoting Asian cultures at UO', 'asu@uoregon.edu', 'https://asu.uoregon.edu')
        ON CONFLICT (name) DO NOTHING;
        """,
        
        # Sample locations
        """
        INSERT INTO locations (building_name, room_number, address, latitude, longitude)
        VALUES 
            ('Deschutes Hall', '117', '1420 Agate St, Eugene, OR 97403', 44.0445, -123.0759),
            ('Erb Memorial Union', '202', '1395 University St, Eugene, OR 97403', 44.0448, -123.0782),
            ('Erb Memorial Union', 'Ballroom', '1395 University St, Eugene, OR 97403', 44.0448, -123.0782),
            ('Knight Library', 'Main Floor', '1299 University St, Eugene, OR 97403', 44.0443, -123.0765),
            ('Matthew Knight Arena', 'Concourse', '1385 E 13th Ave, Eugene, OR 97403', 44.0426, -123.0726)
        ON CONFLICT (building_name, room_number) DO NOTHING;
        """
    ]
    
    try:
        with engine.connect() as connection:
            print("🔄 Inserting sample data...")
            
            for statement in sample_sql:
                connection.execute(text(statement))
                connection.commit()
            
            print("✅ Sample data inserted successfully!")
            return True
            
    except SQLAlchemyError as e:
        print(f"❌ Error inserting sample data: {str(e)}")
        return False


def drop_all_tables():
    """
    Drops all tables - USE WITH CAUTION!
    Only for development/testing purposes.
    """
    
    if engine is None:
        print("❌ Error: Database connection not configured.")
        return False
    
    drop_statements = [
        "DROP TABLE IF EXISTS user_events CASCADE;",
        "DROP TABLE IF EXISTS images CASCADE;",
        "DROP TABLE IF EXISTS events CASCADE;",
        "DROP TABLE IF EXISTS users CASCADE;",
        "DROP TABLE IF EXISTS locations CASCADE;",
        "DROP TABLE IF EXISTS organizations CASCADE;",
        "DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;"
    ]
    
    try:
        with engine.connect() as connection:
            print("⚠️  Dropping all tables...")
            
            for statement in drop_statements:
                connection.execute(text(statement))
                connection.commit()
            
            print("✅ All tables dropped successfully!")
            return True
            
    except SQLAlchemyError as e:
        print(f"❌ Error dropping tables: {str(e)}")
        return False


def test_connection():
    """
    Tests the database connection.
    """
    if engine is None:
        print("❌ Database connection not configured.")
        print("Please set DATABASE_URL in your .env file.")
        return False
    
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
            return True
    except SQLAlchemyError as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False


def init_db():
    """
    Complete database initialization: creates tables and inserts sample data.
    """
    print("=" * 80)
    print("DUCKSGATHER DATABASE INITIALIZATION")
    print("=" * 80)
    print()
    
    # Test connection first
    if not test_connection():
        return False
    
    print()
    
    # Create tables
    if not create_tables():
        return False
    
    print()
    
    # Insert sample data
    response = input("Would you like to insert sample data? (y/n): ").strip().lower()
    if response == 'y':
        insert_sample_data()
    
    print()
    print("=" * 80)
    print("✅ Database initialization complete!")
    print("=" * 80)
    
    return True


if __name__ == "__main__":
    init_db()
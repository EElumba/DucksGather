# DucksGather


## Getting Started

This guide explains how to run both the backend and frontend components of the DucksGather application.


## Prerequisites

- **Backend**: Python with virtual environment
- **Frontend**: Node.js and npm installed
- Make sure you're in the DucksGather root directory

## Running the Full Application

You can run the entire application (frontend + backend)

### Run Frontend and Backend Individually (using two terminals)

#### Start the Backend in a terminal
From the project’s main directory:
```bash
bash run-backend.sh
```

This will take some time


#### Start the Frontend in a separate terminal
In a separate terminal:
```bash

bash run-frontend.sh
```

for a MacOS/Linux user it may be beneficial to chmod +x path/to/Flock\Code/frontend/node_modulues/.bin/react-scripts if the above command results in error.



---

## Manual Setup and Installation

## Backend Guide

### Running the Backend Manually
It is highly recommended to use a virtual environment.

```bash
# 1. Navigate to the root directory (backend/)
cd backend

# 2. Create and activate a virtual environment 
python -m venv venv #alternatively python3 -m venv venv py -m venv venv

# Only create a virtual environment if you don't have one already

source venv/bin/activate  # macOS/Linux
.\venv\Scripts\activate.bat # Windows

# 3. Create requirements.txt (if not already present)
cat <<EOL > requirements.txt
flask
supabase
python-dotenv
sqlalchemy
psycopg2-binary
PyJWT
pytest
requests
flask-cors
bs4
pydantic
tenacity
bleach
beautifulsoup4
lxml
EOL

# Ensure your virtual environment is active!

# Upgrade pip
pip install --upgrade pip

# 4. Install Dependencies
pip install -r requirements.txt # MacOS/Linux
pip install -r .\requirements.txt # Windows

# Running the Scraper
# You must run the scraper first!

# Leave the backend/ folder
cd ..

# Run the scraper
python -m backend.src.scraper.scraper

# Run Flask app
python -m backend.src.app
```

## Frontend Guide

### Running the Frontend Manually
To start just the frontend on its own:

1. Open a terminal in the project’s main directory.  
2. Navigate into the frontend folder:  
   ```bash
   cd frontend
   ```
3. Install dependencies:  
   ```bash
   npm install
   ```
4. Start the development server:  
   ```bash
   npm start
   ```

This will launch the React frontend and automatically open it in your browser.

---

## What the Frontend Handles

The frontend is responsible for all user-facing interactions and application workflows, including:

### Event Management
- Create events – users can add new events through the event creation form.  
- Edit events – existing events can be updated with new details.  
- Delete events – users can remove events they own.  
- Event exploration – browse upcoming or existing events.  
- Search – live search and filtering for events by title, category, or other criteria.

### User Account System
- Login – authenticate existing users.  
- Signup – create a new user account.  
- Session handling – the UI adjusts based on the user’s login status.

### Navigation and Directions
- Interactive map component – displays event locations on a map.  
- Text-based directions – provides readable, screen-reader-friendly step-by-step navigation.  
- Map/text interplay – users can toggle between map view and text directions or use both together. To access the text directions, navigate to the details of any event, and click on the text directions button located beneath the location heading for that event.


## What the Backend Handles

## ⚙️ Core Responsibilities

### 1. Data Management & Persistence (DB Layer)

The backend is the **single source of truth** for all application data.

- **Models**  
  Defined in `backend/src/models/models.py` using SQLAlchemy.  
  These models represent core entities such as:
  - Events
  - Users
  - Locations

- **Database Initialization**  
  `backend/src/db/db_init.py` is responsible for:
  - Creating the database schema
  - Initializing connections (Supabase)
 
### 2. API Endpoints (Routing Layer)

The backend exposes a REST-style API that the frontend uses to interact with data.

- **Event API** – `backend/src/routes/events.py`
  - Create new events
  - Read / explore / search events
  - Update events
  - Delete events  
  This powers the frontend event discovery, details pages, and admin tools.

- **User API** – `backend/src/routes/users.py`
  - Handles user-related operations such as:
    - Fetching user data
    - Updating user profile info
  - Serves as the main interface for user-specific backend logic.

---

### 3. Authentication & Security

The backend is responsible for **verifying user identities** and securing access to data.

- **Login / Signup**
  - Processes user credentials (e.g., email/password) for authentication.
  - Issues secure tokens after successful login.

- **Session Management with JWT**  
  `backend/src/auth/jwt.py` manages:
  - Issuing JSON Web Tokens (JWT)
  - Verifying tokens on protected routes
  - Allowing the frontend to:
    - Determine whether a user is logged in
    - Adjust UI and permissions based on authentication state

---

### 4. Data Harvesting (Web Scraping)

The backend can automatically **harvest external events** and populate the database.

- **Web Scraper Module** – `backend/src/scraper/scraper.py`
  - Fetches event pages from external sources
  - Parses structured event data (JSON-LD)
  - Sanitizes and validates the data
  - Inserts new events into the database  
  Typically run via:
  ```bash
  python -m backend.src.scraper.scraper


## Troubleshooting
- **Backend issues**: Make sure Python 3 is installed and the virtual environment is created properly
- **Frontend issues**: Ensure Node.js and npm are installed, and check for any dependency conflicts
- **Port conflicts**: If ports are already in use, you may need to stop other services or configure different ports


## File Structure Summary

```
DucksGather/
├── .git/                        # Git version control directory
├── .gitignore                   # Git ignore patterns
├── README.md                    # Main project documentation
├── architecture-diagram.md      # System architecture documentation
├── package-lock.json            # Root npm lock file (minimal)
├── run-backend.sh               # Backend startup shell script
├── run-frontend.sh              # Frontend startup shell script
├── run.py                       # Unified launcher script for both services
├── ducks_local.db               # SQLite database file
├── venv/                        # Root Python virtual environment
├── docs/                        # Additional documentation
│   └── (1 item)
├── backend/                     # Python Flask backend application
│   ├── .env                     # Backend environment variables
│   ├── .gitignore               # Backend-specific git ignore
│   ├── __init__.py              # Python package initialization
│   ├── __pycache__/             # Python bytecode cache
│   ├── requirements.txt         # Python dependencies
│   ├── setup.sh                 # Backend environment setup script
│   ├── venv/                    # Backend-specific virtual environment
│   ├── scripts/                 # Utility and maintenance scripts
│   │   ├── ducks_local.db       # Script database reference
│   │   ├── seed_locations.py    # Database seeding for locations
│   │   ├── smoke_events_api.py  # API testing script
│   │   ├── verify_db_url.py     # Database URL verification
│   │   └── verify_user_update.py # User update verification
│   ├── src/                     # Backend source code
│   │   ├── __init__.py          # Source package initialization
│   │   ├── __pycache__/         # Source bytecode cache
│   │   ├── app.py               # Main Flask application entry point
│   │   ├── auth/                # Authentication module
│   │   │   ├── __pycache__/     # Auth module cache
│   │   │   └── jwt.py           # JWT token handling
│   │   ├── db/                  # Database management
│   │   │   ├── README.md        # Database documentation
│   │   │   ├── SCHEMA.md        # Database schema documentation
│   │   │   ├── SQLALCHEMY_GUIDE.md # SQLAlchemy usage guide
│   │   │   ├── __pycache__/     # DB module cache
│   │   │   ├── db_init.py       # Database initialization
│   │   │   └── uo_buildings.json # Campus buildings data
│   │   ├── models/              # Data models
│   │   │   ├── __init__.py      # Models package init
│   │   │   ├── __pycache__/     # Models cache
│   │   │   └── models.py        # SQLAlchemy model definitions
│   │   ├── routes/              # API endpoints
│   │   │   ├── __pycache__/     # Routes cache
│   │   │   ├── events.py        # Event-related API endpoints
│   │   │   └── users.py         # User-related API endpoints
│   │   ├── sanitize/            # Data validation and sanitization
│   │   │   ├── duplicate_check.py # Event duplicate detection
│   │   │   ├── sanitize.py      # Input sanitization
│   │   │   └── schemas.py       # Data validation schemas
│   │   └── scraper/             # Web scraping functionality
│   │       └── scraper.py       # Event scraping from external sources
│   └── tests/                   # Backend test suite
│       ├── conftest.py          # Pytest configuration
│       ├── test_duplicate_check.py # Duplicate checking tests
│       ├── test_events.py       # Events API tests
│       ├── test_sanitize.py     # Sanitization tests
│       ├── test_schemas.py      # Schema validation tests
│       └── test_scraper.py      # Scraper functionality tests
└── frontend/                    # React frontend application
    ├── .env                     # Frontend environment variables
    ├── .gitignore               # Frontend-specific git ignore
    ├── node_modules/            # npm dependencies
    ├── package-lock.json        # npm dependency lock file
    ├── package.json             # npm package configuration
    ├── public/                  # Static assets
    │   ├── campus-hero.jpg      # Campus hero image
    │   ├── event-images/        # Event image storage
    │   ├── favicon.ico          # Website favicon
    │   ├── index.html           # HTML template
    │   ├── logo.png             # Main logo image
    │   ├── logo192.png          # Logo 192x192
    │   ├── logo512.png          # Logo 512x512
    │   ├── manifest.json        # PWA manifest
    │   └── robots.txt           # Search engine instructions
    └── src/                     # Frontend source code
        ├── App.css              # Main application styles
        ├── App.js               # Main React component
        ├── App.test.js          # App component tests
        ├── index.css            # Global styles
        ├── index.js             # React application entry point
        ├── logo.svg             # SVG logo
        ├── reportWebVitals.js   # Performance reporting
        ├── setupTests.js        # Test configuration
        ├── api/                 # API communication layer
        │   └── client.js        # HTTP client for backend API
        ├── components/          # React components
        │   ├── AuthPage.js      # Authentication page component
        │   ├── ConfirmEmail.js  # Email confirmation component
        │   ├── CreateEventForm.js # Event creation form
        │   ├── EditEventForm.js # Event editing form
        │   ├── EventDetail.js   # Event detail view
        │   ├── EventList.js     # Event listing component
        │   ├── ExploreEvents.js # Event exploration interface
        │   ├── ExploreNavbar.js # Navigation for exploration
        │   ├── HomePage.js      # Home page component
        │   ├── LoginButton.js   # Login button component
        │   ├── LoginPage.js     # Login page
        │   ├── Navbar.js        # Main navigation bar
        │   ├── NotFound.js      # 404 error page
        │   ├── ProfilesPage.js  # User profiles page
        │   ├── SearchBar.js     # Search functionality
        │   ├── SignUpPage.js    # User registration page
        │   ├── delete.js        # Event deletion component
        │   └── text_directions.js # Text directions component
        ├── context/             # React context providers
        │   └── AuthContext.js   # Authentication context
        └── styles/              # Component-specific CSS
            ├── AuthPages.css    # Authentication pages styles
            ├── CreateEvent.css  # Event creation form styles
            ├── EventDetail.css  # Event detail page styles
            ├── ExploreEvents.css # Event exploration styles
            ├── ExploreNavbar.css # Exploration navigation styles
            ├── HomePage.css     # Home page styles
            ├── LoginButton.css  # Login button styles
            ├── Navbar.css       # Navigation bar styles
            └── NotFound.css     # 404 page styles
```

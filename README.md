## 🚀 Getting Started

Follow these steps to set up your environment and run the scraper. 

### Setup and Installation

It is highly recommended to use a virtual environment.

```bash
# 1. Navigate to the root directory (backend/)
cd backend

# 2. Create and activate a virtual environment 
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate.bat # Windows

# 3. Create requirements.txt (if not already present)
cat <<EOL > requirements.txt
requests
beautifulsoup4
lxml
pydantic
bleach
tenacity
EOL

# 4. Install Dependencies
pip install -r requirements.txt

# Running the Scraper

# Ensure your virtual environment is active!
python src/scraper/scraper.py

Play around with the commented pprint statements to see what they are doing.

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

## Running the Full Application

You can run the entire application (frontend + backend) in one of two ways:

### Option 1 — Start Everything Automatically
From the project’s main directory:

```bash
python run.py
```

This script launches both the backend server and the frontend development server so the whole system runs together.

---

### Option 2 — Run Frontend and Backend Individually

#### Start the Backend
From the project’s main directory:
```bash
bash run-backend.sh
```


#### Start the Frontend
In a separate terminal:
```bash

bash run-frontend.sh
```

This gives you full control over each service.

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

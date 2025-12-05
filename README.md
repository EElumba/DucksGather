# 🤖 Event Scraper

This repository contains a robust Python web scraper designed to extract structured event data from a target calendar website, specifically targeting **JSON-LD** data embedded in the HTML. The extracted data is then validated against a Pydantic schema and sanitized before being processed.

## ⚙️ Core Components

| File | Location | Purpose |
| :--- | :--- | :--- |
| `scraper.py` | `src/scraper/` | **Main Logic:** Contains the fetching (`fetch_html`), JSON-LD parsing (`parse_listing`), sanitizing (`process_and_validate`) and orchestration (`crawl`) functions. Includes robust retry logic using `tenacity`. |
| `schemas.py` | `src/sanitize/` | **Data Validation:** Defines the `EventCreate` Pydantic model for strict data structure, type, and logical constraint checking. |
| `sanitize.py` | `src/sanitize/` | **Data Cleaning:** Provides utilities (`clean_html`, `normalize_whitespace`, `clip`) to sanitize raw string data before validation. |


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
- Map/text interplay – users can toggle between map view and text directions or use both together. To acces the text directions, navigate to the details of any event, and click on the text directions button located beneath the location heading for that event.


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


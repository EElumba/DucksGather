# DucksGather Event Scraper

This repository contains a web scraper that collects event data from the University of Oregon event calendar, sanitizes and validates it, deduplicates entries, and stores the results in the DucksGather backend database.

The system is built with:

- **Python 3**
- **Requests + BeautifulSoup** for HTML fetching/parsing
- **JSON-LD** extraction from `<script type="application/ld+json">`
- **Pydantic** for schema validation
- **Bleach** for HTML sanitization
- **SQLAlchemy** for database access
- **Tenacity** for retry logic
- **dotenv** for environment configuration

---

## Features

- 🌐 **Scrapes UO event calendar** 
- 📄 **Parses JSON-LD event data** (name, dates, location, description, etc.)
- 🧼 **Sanitizes HTML** and normalizes text fields
- ✅ **Validates event payloads** using a strict Pydantic model
- 🗓️ **Filters out past events**
- 🔁 **Prevents duplicate events** using title-based checks
- 🗺️ **Creates or reuses locations** based on building name and address
- 💾 **Inserts events into the DucksGather DB** as `Event` and `Location` rows

---

## Repository Structure (Relevant Parts)

```text
backend/
  src/
    scraper/
      scraper.py            # Main crawler & DB insertion logic
    sanitize/
      sanitize.py           # HTML cleaning, whitespace normalization, date filtering
      duplicate_check.py    # Duplicate detection utilities
      schemas.py            # Pydantic EventCreate schema and validators
    models/
      models.py             # SQLAlchemy models for Event, Location, etc.
    db/
      db_init.py            # SessionLocal, engine, Base, DB config

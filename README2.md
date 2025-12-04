# DucksGather - Running the Application -Using run.py Launcher

This guide explains how to use the `run.py` launcher script, which provides an automated way to start both the backend and frontend services.

## Overview

`run.py` is a Python launcher script that automatically:
- Creates and manages a Python virtual environment
- Installs backend dependencies
- Starts the Flask backend server
- Installs frontend dependencies
- Starts the React frontend development server
- Handles graceful shutdown of both services

## Prerequisites

- **Python 3** installed on your system
- **Node.js and npm** installed for the frontend
- Make sure you're in the DucksGather root directory

## Quick Start

### Option 1: Using Python 3 explicitly
```bash
python3 run.py
```

### Option 2: Making it executable (Unix/Linux/macOS)
```bash
chmod +x run.py
./run.py
```

## What the Script Does

The launcher performs these steps automatically:

1. **Virtual Environment Setup**
   - Creates a Python virtual environment (`venv`) if it doesn't exist
   - Detects the correct Python executable path for your OS

2. **Backend Setup**
   - Installs backend dependencies from `requirements.txt` (if present)
   - Starts the Flask backend server using `python -m backend.src.app`
   - Waits for the backend to respond (up to 15 seconds timeout)

3. **Frontend Setup**
   - Installs npm dependencies in the `frontend/` directory
   - Starts the React development server with `npm start`

4. **Process Management**
   - Streams output from both backend and frontend
   - Handles graceful shutdown when you stop the script
   - Automatically terminates the backend when the frontend stops

## Output Format

While running, you'll see output prefixed to identify the source:
- `[BACKEND] ` - Backend server logs
- Regular output - Frontend server logs and npm messages

## Features

- **Cross-platform compatibility**: Works on Windows, macOS, and Linux
- **Automatic dependency management**: Installs missing dependencies
- **Health checking**: Waits for backend to be ready before starting frontend
- **Graceful shutdown**: Properly terminates all processes
- **Output streaming**: Real-time logs from both services

## Troubleshooting

### Port Conflicts
- Backend runs on port 5000 by default
- Frontend runs on port 3000 by default (will prompt for alternative if occupied)
- If ports are in use, the script will handle frontend port conflicts automatically

### Common Issues

1. **Python not found**
   - Ensure Python 3 is installed and in your PATH
   - Try `python3 run.py` instead of `python run.py`

2. **Node.js/npm issues**
   - Verify Node.js and npm are installed
   - Check that npm has permissions to create files

3. **Backend timeout**
   - If backend doesn't start within 15 seconds, you'll see a warning
   - The frontend will still start, but may not be able to fetch data initially

4. **Permission issues**
   - On Unix systems, you may need to make the script executable: `chmod +x run.py`

## Manual Alternative

If you prefer to run services manually, 
1.. *Open two terminal windows*
2.. *Terminal 1 - Backend*:
'''bash
Ensure you are within the DucksGather directory:

cd backend
python3 -m venv venv
source setup.sh
cd ..
python -m backend.src.app
'''
3.. *Terminal 2 - Frontend*: `./run-frontend.sh`
'''bash
Ensure you are within the DucksGather directory:
cd frontend
npm install
npm start
'''

## File Structure


```
DucksGather/
├── run.py            # Runs both frontend and backend
├── backend/          # Python Flask application
│   ├── venv/         # Python virtual environment
│   └── src/          # Source code
└── frontend/         # React application
    ├── node_modules/ # npm dependencies
    └── src/          # Source code
```


## Stopping the Application

To stop both services:
- Press `Ctrl+C` in the terminal where `run.py` is running
- The script will automatically shut down the backend server
- Both services will stop gracefully

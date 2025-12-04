# DucksGather - Running the Application

This guide explains how to run both the backend and frontend components of the DucksGather application.

## Prerequisites

- **Backend**: Python 3 with virtual environment support
- **Frontend**: Node.js and npm installed
- Make sure you're in the DucksGather root directory

## Running the Backend

The backend is a Flask application that runs on Python.

### Quick Start
```bash
./run-backend.sh

or

bash run-backend.sh
```

### What the script does:
1. Navigates to the backend directory
2. Creates a Python virtual environment if it doesn't exist (`venv`)
3. Activates the virtual environment using `setup.sh`
4. Runs the Flask application with `python -m backend.src.app`

### Manual Steps (if needed)
```bash
cd backend
python3 -m venv venv
source setup.sh
cd ..
python -m backend.src.app
```


## Running the Frontend

The frontend is a React application that runs on Node.js.

### Quick Start
```bash
./run-frontend.sh

or

bash run-frontend.sh
```

### What the script does:
1. Navigates to the frontend directory
2. Installs npm dependencies if `node_modules` doesn't exist
3. Starts the React development server with `npm start`

### Manual Steps (if needed)
```bash
cd frontend
npm install
npm start
```

## Running Both Services

To run the full application, you'll need both services running:

1. **Open two terminal windows**
2. **Terminal 1 - Backend**: `./run-backend.sh`
3. **Terminal 2 - Frontend**: `./run-frontend.sh`

The backend will typically start on one port (check the console output) and the frontend will start on its default port (usually 3000 for React apps).

## Troubleshooting

- **Backend issues**: Make sure Python 3 is installed and the virtual environment is created properly
- **Frontend issues**: Ensure Node.js and npm are installed, and check for any dependency conflicts
- **Port conflicts**: If ports are already in use, you may need to stop other services or configure different ports

## File Structure

```
DucksGather/
├── run-backend.sh    # Backend startup script
├── run-frontend.sh   # Frontend startup script
├── backend/          # Python Flask application
│   ├── venv/         # Python virtual environment
│   └── src/          # Source code
└── frontend/         # React application
    ├── node_modules/ # npm dependencies
    └── src/          # Source code
```

import os
import platform
import subprocess
import sys
import time
import signal

ROOT = os.path.dirname(os.path.abspath(__file__))

def run(cmd, cwd=None):
    """Run a command and stream its output."""
    return subprocess.Popen(
        cmd,
        cwd=cwd,
        shell=True
    )

def main():
    print("=== Ducks Gather Cross-Platform Launcher ===")

    # 1. Create virtual environment if missing
    venv_path = os.path.join(ROOT, "venv")
    if not os.path.exists(venv_path):
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"])

    # 2. Determine activation command based on OS
    system = platform.system()
    if system == "Windows":
        activate = os.path.join(venv_path, "Scripts", "activate")
        py_exec = os.path.join(venv_path, "Scripts", "python.exe")
    else:
        activate = os.path.join(venv_path, "bin", "activate")
        py_exec = os.path.join(venv_path, "bin", "python")

    # 3. Install backend dependencies (optional)
    reqs = os.path.join(ROOT, "requirements.txt")
    if os.path.exists(reqs):
        print("Installing backend dependencies...")
        subprocess.run([py_exec, "-m", "pip", "install", "-r", "requirements.txt"])

    # 4. Start backend
    print("Starting backend...")
    backend = run(f"{py_exec} -m backend.src.app", cwd=ROOT)
    time.sleep(1)  # Give backend a second to start

    # 5. Move into frontend and run npm
    frontend_dir = os.path.join(ROOT, "frontend")
    print("Running npm install...")
    subprocess.run("npm install", cwd=frontend_dir, shell=True)

    print("Starting frontend (this will block)...")
    try:
        subprocess.run("npm start", cwd=frontend_dir, shell=True)
    finally:
        print("Shutting down backend...")
        if system == "Windows":
            backend.terminate()
        else:
            os.kill(backend.pid, signal.SIGTERM)

    print("Done.")

if __name__ == "__main__":
    main()

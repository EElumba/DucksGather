import os
import platform
import subprocess
import sys
import time
import signal
import threading
import requests

ROOT = os.path.dirname(os.path.abspath(__file__))

def run(cmd, cwd=None):
    """Run a command and return the Popen object."""
    return subprocess.Popen(cmd, cwd=cwd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

def stream_process_output(proc, prefix=""):
    """Stream stdout of a subprocess in a separate thread."""
    def target():
        for line in iter(proc.stdout.readline, ''):
            if line:
                print(f"{prefix}{line}", end="")
    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    return thread

def wait_for_backend(url="http://127.0.0.1:5000/", timeout=15):
    """Wait until backend responds with status < 500 or timeout."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(url)
            if r.status_code < 500:
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(0.5)
    return False

def main():
    print("=== Ducks Gather Launcher ===\n")

    # --- 1. Create virtual environment if missing ---
    venv_path = os.path.join(ROOT, "venv")
    if not os.path.exists(venv_path):
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)

    # --- 2. Determine Python executable in venv ---
    if platform.system() == "Windows":
        py_exec = os.path.join(venv_path, "Scripts", "python.exe")
    else:
        py_exec = os.path.join(venv_path, "bin", "python")

    # --- 3. Install backend dependencies ---
    reqs_file = os.path.join(ROOT, "requirements.txt")
    if os.path.exists(reqs_file):
        print("Installing backend dependencies...")
        subprocess.run([py_exec, "-m", "pip", "install", "-r", reqs_file],
                       check=True,
                       stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL)

    # --- 4. Start backend ---
    print("Starting backend...")
    backend_cmd = f'"{py_exec}" -m backend.src.app' if platform.system() == "Windows" else f"{py_exec} -m backend.src.app"
    backend_proc = run(backend_cmd, cwd=ROOT)
    stream_process_output(backend_proc, prefix="[BACKEND] ")

    # Wait for backend to respond
    print("Waiting for backend to be ready...")
    if not wait_for_backend("http://127.0.0.1:5000/"):
        print("Warning: Backend did not respond in time. Frontend may fail to fetch data.")
    else:
        print("Backend is ready!")

    # --- 5. Start frontend ---
    frontend_dir = os.path.join(ROOT, "frontend")
    print("Installing frontend dependencies (npm install)...")
    subprocess.run("npm install", cwd=frontend_dir, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print("Launching frontend...")
    try:
        subprocess.run("npm start", cwd=frontend_dir, shell=True)
    finally:
        print("\nShutting down backend...")
        if platform.system() == "Windows":
            backend_proc.terminate()
        else:
            os.kill(backend_proc.pid, signal.SIGTERM)

    print("All done.")

if __name__ == "__main__":
    main()

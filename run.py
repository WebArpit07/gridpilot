#!/usr/bin/env python3
"""
GridPilot — Unified One-Click Demo Orchestrator
Repo Reboot I.Fest '26 | Stage 7 Production Launcher

Automates:
  1. Virtual environment & dependency verification.
  2. Pre-flight verification test suite (pytest).
  3. Parallel execution of FastAPI backend (:8000) and Next.js frontend (:3000).
  4. Formatted dashboard console banner with direct links.
  5. Graceful shutdown on Ctrl+C (releasing Windows and Unix ports).
"""

import atexit
import os
import platform
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

# Safe console output for Windows cp1252
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Paths
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"


def get_venv_python() -> Path:
    """Finds the Python binary inside .venv or falls back to sys.executable."""
    if platform.system() == "Windows":
        venv_py = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
    else:
        venv_py = ROOT_DIR / ".venv" / "bin" / "python"

    if venv_py.exists():
        return venv_py

    # Check if running within a virtual environment already
    if sys.prefix != sys.base_prefix:
        return Path(sys.executable)

    print(f"⚠️  Virtual environment not detected at {ROOT_DIR / '.venv'}.")
    print("👉 Creating virtual environment or run: python -m venv .venv && pip install -r backend/requirements.txt")
    return Path(sys.executable)


def verify_dependencies(python_exe: Path) -> None:
    """Ensures backend requirements and frontend node_modules exist."""
    print("🔍 [1/3] Verifying runtime dependencies...")

    # Verify backend packages
    check_code = "import fastapi, uvicorn, pydantic, pytest; print('OK')"
    res = subprocess.run([str(python_exe), "-c", check_code], capture_output=True, text=True)
    if res.returncode != 0:
        print("❌ Missing backend dependencies. Installing from backend/requirements.txt...")
        install_res = subprocess.run([str(python_exe), "-m", "pip", "install", "-r", str(BACKEND_DIR / "requirements.txt")])
        if install_res.returncode != 0:
            print("❌ Failed to install backend dependencies.")
            sys.exit(1)

    # Verify frontend node_modules
    if not (FRONTEND_DIR / "node_modules").exists():
        print("📦 Frontend dependencies not found. Running 'npm install' in frontend/...")
        npm_cmd = shutil.which("npm.cmd") or shutil.which("npm") or "npm"
        npm_res = subprocess.run([npm_cmd, "install"], cwd=str(FRONTEND_DIR), shell=(platform.system() == "Windows"))
        if npm_res.returncode != 0:
            print("❌ 'npm install' failed. Please check your Node.js installation.")
            sys.exit(1)

    print("   ✅ Backend and frontend dependencies verified.")


def run_preflight_tests(python_exe: Path) -> None:
    """Runs pytest to guarantee 100% test pass rate before launching services."""
    print("🧪 [2/3] Running pre-flight verification test suite (pytest)...")
    start_time = time.time()
    res = subprocess.run([str(python_exe), "-m", "pytest", "-q"], cwd=str(ROOT_DIR))
    elapsed = time.time() - start_time

    if res.returncode != 0:
        print(f"❌ Pre-flight tests failed after {elapsed:.2f}s! Aborting server startup to prevent unstable demo state.")
        sys.exit(res.returncode)

    print(f"   ✅ All tests passed ({elapsed:.2f}s). System integrity verified.")


def print_banner() -> None:
    """Prints formatted console banner with direct links."""
    banner = f"""
========================================================================================
  ⚡ GRIDPILOT — Autonomous EV Fleet & Dynamic Power Allocation Manager
  Repo Reboot I.Fest '26 | Liquid OS Architecture
========================================================================================
  🌐 Frontend Dashboard : http://localhost:3000
  📚 Swagger API Docs   : http://localhost:8000/docs
  ❤️  System Health API  : http://127.0.0.1:8000/health
  📊 CSV Report Export  : POST http://127.0.0.1:8000/api/simulations/export/csv
========================================================================================
  Status: Both FastAPI and Next.js are running in parallel.
  Press [Ctrl + C] anytime to shut down all processes cleanly.
========================================================================================
"""
    print(banner)


def kill_process_tree(proc: subprocess.Popen) -> None:
    """Gracefully and forcefully terminates a process and its children without leaving orphaned ports."""
    if proc.poll() is not None:
        return

    pid = proc.pid
    if platform.system() == "Windows":
        # Forcefully terminate entire process tree on Windows
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
    else:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except Exception:
            proc.terminate()


def main() -> None:
    print("\n🚀 Initializing GridPilot One-Click Launcher...")

    python_exe = get_venv_python()
    verify_dependencies(python_exe)
    run_preflight_tests(python_exe)

    print("⚡ [3/3] Launching FastAPI Backend and Next.js Frontend in parallel...")

    processes: list[subprocess.Popen] = []

    def shutdown(signum=None, frame=None):
        print("\n🛑 Shutting down GridPilot processes gracefully...")
        for p in processes:
            kill_process_tree(p)
        print("✅ Ports :8000 and :3000 successfully released. Goodbye!\n")
        sys.exit(0)

    # Register exit handlers
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    atexit.register(lambda: [kill_process_tree(p) for p in processes])

    # 1. Start FastAPI Backend
    backend_cmd = [
        str(python_exe),
        "-m",
        "uvicorn",
        "app.main:app",
        "--app-dir",
        str(BACKEND_DIR),
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
        "--reload",
    ]

    # Use creationflags or preexec_fn for clean process tree management
    backend_kwargs = {}
    frontend_kwargs = {}
    if platform.system() == "Windows":
        backend_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        frontend_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        backend_kwargs["preexec_fn"] = os.setsid
        frontend_kwargs["preexec_fn"] = os.setsid

    backend_proc = subprocess.Popen(backend_cmd, cwd=str(ROOT_DIR), **backend_kwargs)
    processes.append(backend_proc)

    # 2. Start Next.js Frontend
    npm_cmd = shutil.which("npm.cmd") or shutil.which("npm") or "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=str(FRONTEND_DIR),
        shell=(platform.system() == "Windows"),
        **frontend_kwargs,
    )
    processes.append(frontend_proc)

    # Allow servers 2 seconds to initialize then print banner
    time.sleep(2)
    print_banner()

    try:
        # Monitor processes
        while True:
            time.sleep(0.5)
            for p in processes:
                if p.poll() is not None:
                    print(f"⚠️  Process PID {p.pid} exited unexpectedly with code {p.returncode}.")
                    shutdown()
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()

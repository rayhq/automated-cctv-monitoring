import logging
import sys
from pathlib import Path

def test_logging():
    # Simulate the logic in logging_config.py
    # app/core/logging_config.py -> ../../../backend
    
    # We are in scripts/test_logging.py -> ../backend (depends on where we run it from)
    # But let's use the exact logic from logging_config.py but adapted for this location
    # Or just import the module if possible.
    
    print(f"Running from: {os.getcwd()}")
    
    try:
        from app.core.logging_config import setup_logging
        print("Imported setup_logging successfully.")
        setup_logging()
        print("setup_logging() called.")
    except Exception as e:
        print(f"Error importing/calling setup_logging: {e}")
        # Fallback manual test
        BASE_DIR = Path(os.getcwd())
        LOG_DIR = BASE_DIR / "logs"
        LOG_FILE = LOG_DIR / "test_manual.log"
        print(f"Manual Test: Trying to write to {LOG_FILE}")
        try:
            LOG_DIR.mkdir(parents=True, exist_ok=True)
            with open(LOG_FILE, "w") as f:
                f.write("Test log entry")
            print("Manual write success.")
        except Exception as e:
            print(f"Manual write failed: {e}")

if __name__ == "__main__":
    import os
    # Add backend to sys.path
    backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    sys.path.append(backend_path)
    test_logging()

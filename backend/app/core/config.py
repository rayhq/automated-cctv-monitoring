import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the backend root directory
# (Assuming config.py is in app/, so backend is parent of parent?
# Wait, app/config.py -> parent is app, parent.parent is backend.
# Let's be careful with paths.
# If running from backend root (main.py), .env is in current dir.
# But explicit path is safer.)

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback-secret-for-dev-only")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))

settings = Settings()

# app/core/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use environment variable or default to sqlite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cctv.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    FastAPI dependency that gives a SQLAlchemy session
    and closes it automatically after the request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import requests
import sys
import os

# Add backend to path to import models if needed, but requests is safer
# We will just hit the API if possible, or direct DB
# API is running on 8001 (according to user)

API_URL = "http://127.0.0.1:8001"

def check_images():
    print(f"Checking API at {API_URL}...")
    try:
        # 1. Login to get token (if needed, but events might be public or we need a token)
        # Events endpoint usually protected.
        # Let's try to cheat and check public health first
        r = requests.get(f"{API_URL}/api/health")
        if r.status_code != 200:
             print(f"❌ API Health check failed: {r.status_code}")
             return

        # 2. We need a token to fetch events. 
        # Using a hardcoded login if we know it (admin:admin usually default?)
        # Or we can just inspect the sqlite file directly.
        # Let's inspect sqlite directly, it's safer than guessing passwords.
        
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        
        # Adjust path to DB
        # backend is in d:\Development\automated-cctv-monitoring\backend
        # sqlitedb usually app.db or sql_app.db
        
        db_path = "sqlite:///./backend/sql_app.db" # relative to workspace root? 
        # CWD is d:\Development\automated-cctv-monitoring\backend (base on user state)
        # So just sqlite:///./sql_app.db
        
        engine = create_engine("sqlite:///data/cctv.db")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id, image_path FROM events ORDER BY timestamp DESC LIMIT 5"))
            rows = result.fetchall()
            
            if not rows:
                print("⚠️ No events found in DB.")
                return

            print(f"Found {len(rows)} recent events:")
            for row in rows:
                print(f" - ID: {row[0]}, Path: '{row[1]}'")
                
                # Try to fetch
                if row[1]:
                    img_url = f"{API_URL}/{row[1]}"
                    print(f"   Testing fetch: {img_url}")
                    try:
                        ir = requests.get(img_url)
                        if ir.status_code == 200:
                            print(f"   ✅ Image FETCH SUCCESS ({len(ir.content)} bytes)")
                        else:
                            print(f"   ❌ Image FETCH FAILED: {ir.status_code}")
                    except Exception as e:
                        print(f"   ❌ Fetch Error: {e}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_images()

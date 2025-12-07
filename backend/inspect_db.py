# backend/inspect_db.py
from app.database import SessionLocal
from app.models import Camera

def inspect_cameras():
    db = SessionLocal()
    cameras = db.query(Camera).all()
    
    print("\n🔍 --- DATABASE DEEP INSPECTION ---")
    print(f"{'PK (ID)':<8} | {'Camera_ID (Raw)':<20} | {'repr() Check'}")
    print("-" * 60)
    
    for cam in cameras:
        # repr() reveals hidden characters like \n, \t, or spaces
        print(f"{cam.id:<8} | {cam.camera_id:<20} | {repr(cam.camera_id)}")
        
    print("-" * 60)
    db.close()

if __name__ == "__main__":
    inspect_cameras()
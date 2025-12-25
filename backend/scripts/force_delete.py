# backend/force_delete.py
from app.database import SessionLocal
from app.models import Camera, Event

def force_delete_camera():
    db = SessionLocal()
    
    # 1. List all cameras
    cameras = db.query(Camera).all()
    print("\n📸 --- CURRENT CAMERAS IN DB ---")
    print(f"{'ID (PK)':<10} | {'Camera ID (String)':<20} | {'Name'}")
    print("-" * 50)
    
    for cam in cameras:
        # We put quotes around the ID to reveal hidden spaces like "cam1 "
        print(f"{cam.id:<10} | '{cam.camera_id}'{' ':<10} | {cam.name}")
    print("-" * 50)
    
    if not cameras:
        print("✅ Database is empty. Nothing to delete.")
        return

    # 2. Ask user which one to delete
    try:
        target_id = int(input("\nEnter the NUMERIC ID (PK) of the camera to delete: "))
    except ValueError:
        print("❌ Invalid input. Please enter a number.")
        return

    # 3. Find and Delete
    camera_to_delete = db.query(Camera).filter(Camera.id == target_id).first()
    
    if camera_to_delete:
        print(f"\n⚠️  Deleting Camera: {camera_to_delete.camera_id}...")
        
        # Step A: Delete orphan events first
        deleted_events = db.query(Event).filter(Event.camera_id == camera_to_delete.camera_id).delete()
        print(f"   - Deleted {deleted_events} associated history events.")
        
        # Step B: Delete the camera
        db.delete(camera_to_delete)
        db.commit()
        print("✅ Camera deleted successfully!")
    else:
        print("❌ Camera with that Numeric ID not found.")
    
    db.close()

if __name__ == "__main__":
    force_delete_camera()
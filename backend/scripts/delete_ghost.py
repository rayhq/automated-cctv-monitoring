# backend/delete_ghost.py
from app.database import SessionLocal
from app.models import Camera, Event

def delete_ghost_camera():
    db = SessionLocal()
    
    # 1. Select the camera with Numeric ID 1
    target_id = 1
    camera = db.query(Camera).filter(Camera.id == target_id).first()
    
    if not camera:
        print(f"❌ Camera with ID {target_id} is already gone.")
        return

    print(f"⚠️ Found Camera: '{camera.camera_id}' (ID: {camera.id})")
    
    # 2. Delete associated events first (Clean history)
    deleted_events = db.query(Event).filter(Event.camera_id == camera.camera_id).delete()
    print(f"   - Deleted {deleted_events} history events.")

    # 3. Delete the camera
    db.delete(camera)
    db.commit()
    print("✅ Camera deleted successfully directly from DB!")
    db.close()

if __name__ == "__main__":
    delete_ghost_camera()
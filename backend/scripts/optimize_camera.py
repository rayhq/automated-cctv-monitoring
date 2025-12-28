
from app.core.database import SessionLocal
from app.models.all_models import Camera

db = SessionLocal()
# Find the camera (assuming it's the one with the RTSP url we saw)
# Or just update ALL cameras pointing to 192.168.1.3 to use /video
cams = db.query(Camera).filter(Camera.rtsp_url.like("%192.168.1.3%")).all()

print(f"Found {len(cams)} cameras to optimize.")

for cam in cams:
    old_url = cam.rtsp_url
    # Construct new URL
    # If it was rtsp://192.168.1.3:8080/..., make it http://192.168.1.3:8080/video
    if "8080" in old_url:
        new_url = "http://192.168.1.3:8080/video"
        cam.rtsp_url = new_url
        print(f"🔄 Updating {cam.camera_id}: {old_url} -> {new_url}")

db.commit()
print("✅ Optimization complete.")

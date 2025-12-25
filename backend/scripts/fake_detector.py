# app/fake_detector.py
import random
import time
from datetime import datetime
import requests

API_URL = os.getenv("API_URL", "http://localhost:8000/api/events")

CAMERAS = ["cam1", "cam2"]
EVENT_TYPES = ["intrusion", "loitering", "crowd"]

def generate_fake_event():
    camera_id = random.choice(CAMERAS)
    event_type = random.choice(EVENT_TYPES)
    confidence = round(random.uniform(0.7, 0.99), 2)  # 0.70 - 0.99

    description = f"Generated at {datetime.utcnow().isoformat()}"

    payload = {
        "camera_id": camera_id,
        "event_type": event_type,
        "confidence": confidence,
        "description": description,
        "image_path": None,  # later: "media/..." when you save frames
    }
    return payload

def main():
    print("Starting fake detector – sending events to FastAPI...")
    while True:
        event = generate_fake_event()
        try:
            resp = requests.post(API_URL, json=event, timeout=5)
            if resp.status_code == 201:
                print("✅ Sent event:", event)
            else:
                print("⚠️ Error:", resp.status_code, resp.text)
        except Exception as e:
            print("❌ Request failed:", e)

        # send one event every 3 seconds
        time.sleep(3)

if __name__ == "__main__":
    main()

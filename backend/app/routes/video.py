# app/routes/video.py
import time
import threading
import traceback
from pathlib import Path
from typing import List, Dict, Any

import cv2
import numpy as np
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ultralytics import YOLO

from app.database import SessionLocal
from app import models

router = APIRouter()

# ==========================================
# 🛑 GLOBAL SHUTDOWN SIGNAL
# ==========================================
server_stop_event = None

def set_stop_event(e: threading.Event):
    """Called by main.py to pass the global stop event"""
    global server_stop_event
    server_stop_event = e

# ==========================================
# ⚙️ CONFIGURATION & CONSTANTS
# ==========================================
CONFIDENCE_THRESHOLD = 0.4
FRAME_SKIP = 3  # Run AI every N frames
STREAM_RESOLUTION = (960, 540)
EVENT_COOLDOWN = 15.0  # Seconds between database logs

# Colors (B, G, R)
COLOR_RED = (0, 0, 255)    # Threat/Phone
COLOR_GREEN = (0, 255, 0)  # Safe/Person
COLOR_TEXT = (255, 255, 255)

# Media Storage
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MEDIA_DIR = BASE_DIR / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# State Management
last_event_time: Dict[str, float] = {}

# ==========================================
# 🧠 AI MODEL LOADING
# ==========================================
print("🔁 Loading YOLOv8 model (yolov8n.pt)...")
try:
    model = YOLO("yolov8n.pt")
    print("✅ YOLOv8 model loaded successfully.")

    PHONE_CLASS_IDS = [id for id, name in model.names.items() if "phone" in str(name).lower()]
    PERSON_CLASS_IDS = [id for id, name in model.names.items() if "person" in str(name).lower()]
except Exception as e:
    print(f"🔥 Error loading model: {e}")
    model = None
    PHONE_CLASS_IDS = []
    PERSON_CLASS_IDS = []

# ==========================================
# 🛠️ HELPER FUNCTIONS
# ==========================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_error_frame(message: str):
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(frame, message, (30, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_RED, 2)
    _, jpeg = cv2.imencode(".jpg", frame)
    return (b"--frame\r\n" b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")

# ==========================================
# 🎥 STREAM GENERATOR
# ==========================================
def generate_stream(camera_id: str, db: Session):
    """
    Stream a single camera. This loop now *re-checks* the camera's is_active flag,
    so if you toggle a camera off in the UI, the running stream will exit cleanly.
    """
    global last_event_time
    camera_id = camera_id.strip()

    # 1. Initial database lookup
    cam = (
        db.query(models.Camera)
        .filter(models.Camera.camera_id == camera_id)
        .first()
    )
    if not cam or not cam.is_active:
        yield create_error_frame(f"OFFLINE: {camera_id}")
        return

    rtsp_url = cam.rtsp_url
    print(f"📡 Connecting to {camera_id} at {rtsp_url}...")

    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        yield create_error_frame("CONNECTION FAILED")
        return

    frame_count = 0
    cached_boxes = []

    # Track stats for the current frame
    current_person_count = 0
    current_phone_count = 0
    current_best_conf = 0.0
    current_anomaly = None

    try:
        while True:
            # 🛑 1) CHECK FOR SERVER SHUTDOWN (Ctrl+C)
            if server_stop_event and server_stop_event.is_set():
                print(f"🛑 Shutdown signal received. Closing stream for {camera_id}")
                break

            # 🛑 2) CHECK CAMERA ACTIVE FLAG (so toggle works on already-open streams)
            #    We re-query only a small column; cheap but effective.
            cam_state = (
                db.query(models.Camera.is_active)
                .filter(models.Camera.camera_id == camera_id)
                .first()
            )
            if not cam_state or not cam_state[0]:
                print(f"🚫 Camera {camera_id} disabled in UI – stopping its stream.")
                break

            success, frame = cap.read()
            if not success:
                # If this is a file / flaky stream, you can loop it
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            frame = cv2.resize(frame, STREAM_RESOLUTION)
            frame_count += 1

            # ---------------------------------------------------------
            # 3. AI INFERENCE (Runs periodically)
            # ---------------------------------------------------------
            if model and (frame_count % FRAME_SKIP == 0):
                cached_boxes = []
                current_person_count = 0
                current_phone_count = 0
                current_best_conf = 0.0
                current_anomaly = None

                results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)

                for r in results:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])

                        is_phone = cls_id in PHONE_CLASS_IDS
                        is_person = cls_id in PERSON_CLASS_IDS

                        if is_phone or is_person:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])

                            if is_phone:
                                color = COLOR_RED
                                label = f"Phone {conf:.2f}"
                                current_phone_count += 1
                                current_best_conf = max(current_best_conf, conf)
                            else:
                                color = COLOR_GREEN
                                label = f"Person {conf:.2f}"
                                current_person_count += 1
                                current_best_conf = max(current_best_conf, conf)

                            cached_boxes.append((x1, y1, x2, y2, color, label))

                # Determine event type
                if current_phone_count > 0:
                    current_anomaly = "mobile_phone"
                elif current_person_count > 0:
                    current_anomaly = "intrusion"

            # ---------------------------------------------------------
            # 4. DRAW BOXES
            # ---------------------------------------------------------
            for (x1, y1, x2, y2, color, label) in cached_boxes:
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                t_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                cv2.rectangle(frame, (x1, y1 - 20), (x1 + t_size[0], y1), color, -1)
                cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_TEXT, 2)

            # ---------------------------------------------------------
            # 5. SAVE SNAPSHOT (only when anomaly + cooldown)
            # ---------------------------------------------------------
            now = time.time()
            last_time = last_event_time.get(camera_id, 0.0)

            if (frame_count % FRAME_SKIP == 0) and current_anomaly and (now - last_time > EVENT_COOLDOWN):
                filename = f"{camera_id}_{int(now)}.jpg"
                save_path = MEDIA_DIR / filename

                # save annotated frame
                cv2.imwrite(str(save_path), frame)

                new_event = models.Event(
                    camera_id=camera_id,
                    event_type=current_anomaly,
                    confidence=current_best_conf,
                    description=f"Detected: {current_person_count} Persons, {current_phone_count} Phones",
                    image_path=f"media/{filename}",
                )
                db.add(new_event)
                db.commit()

                last_event_time[camera_id] = now
                print(f"📸 Snapshot saved with boxes: {filename}")

            # ---------------------------------------------------------
            # 6. STREAM TO BROWSER
            # ---------------------------------------------------------
            info = f"Cam: {camera_id} | Persons: {current_person_count} | Phones: {current_phone_count}"
            cv2.putText(frame, info, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, COLOR_GREEN, 2)

            ret, buffer = cv2.imencode(".jpg", frame)
            if not ret:
                continue

            try:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" +
                    buffer.tobytes() +
                    b"\r\n"
                )
            except GeneratorExit:
                # Client closed tab
                print(f"👋 Client disconnected from {camera_id}")
                break
            except Exception:
                # Pipe broke
                break

    except Exception as e:
        print(f"💥 Stream crashed: {e}")
        traceback.print_exc()
        yield create_error_frame("SERVER ERROR")
    finally:
        cap.release()
        print(f"🛑 Stream released: {camera_id}")

# ==========================================
# 🛣️ ROUTES
# ==========================================
@router.get("/video/stream/{camera_id}")
def video_stream_endpoint(camera_id: str, db: Session = Depends(get_db)):
    return StreamingResponse(
        generate_stream(camera_id, db),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

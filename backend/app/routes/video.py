# app/routes/video.py
import os
import time
import threading
import traceback
from pathlib import Path
from typing import Dict

import cv2
import numpy as np
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from urllib.parse import urlsplit, urlunsplit, quote

from app.database import SessionLocal
from app import models
from app.detection import ObjectDetector

router = APIRouter()

# ==========================================
# 🔧 GLOBAL FFMPEG / RTSP SETTINGS
# ==========================================
# Force RTSP over TCP for more stable streaming
# os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|max_delay;5000000"

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
FRAME_SKIP = 3               # Lowered to 3 for smoother AI updates
STREAM_RESOLUTION = (640, 360)
EVENT_COOLDOWN = 15.0        # Seconds between database logs

# Increased to 30 for realtime feel. 
# We rely on threaded capture to keep up.
TARGET_FPS = 30              
FRAME_INTERVAL = 1.0 / TARGET_FPS

JPEG_QUALITY = 70            # 0–100, lower = smaller, faster
MAX_CONSECUTIVE_FAILS = 30   # how many failed reads before reconnect

# Colors (B, G, R)
COLOR_RED = (0, 0, 255)      # Threat/Phone
COLOR_GREEN = (0, 255, 0)    # Safe/Person
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
# Initialize the detector globally to load the model once
detector = ObjectDetector(conf_threshold=CONFIDENCE_THRESHOLD)


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
    cv2.putText(
        frame, message, (30, 240),
        cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_RED, 2
    )
    _, jpeg = cv2.imencode(".jpg", frame)
    return (
        b"--frame\r\n"
        b"Content-Type: image/jpeg\r\n\r\n" +
        jpeg.tobytes() +
        b"\r\n"
    )


def normalize_rtsp_url(rtsp_url: str) -> str:
    """
    Ensure password is URL-encoded (handles 'test@2025' -> 'test%402025').
    Safe to call even if already encoded.
    """
    try:
        parts = urlsplit(rtsp_url)

        if parts.username and parts.password:
            pwd = parts.password

            # If password is not already percent-encoded, encode it
            if "%" not in pwd:
                encoded_pwd = quote(pwd, safe="")
                host = parts.hostname or ""
                port = f":{parts.port}" if parts.port else ""
                userinfo = f"{parts.username}:{encoded_pwd}@"
                netloc = userinfo + host + port
                normalized = urlunsplit(
                    (parts.scheme, netloc, parts.path, parts.query, parts.fragment)
                )
                return normalized

        return rtsp_url
    except Exception:
        return rtsp_url


def add_tcp_param(rtsp_url: str) -> str:
    """Append ?tcp or &tcp to enforce TCP at URL level, ONLY for RTSP."""
    if not rtsp_url.lower().startswith("rtsp://"):
        return rtsp_url
        
    if "tcp" in rtsp_url:
        return rtsp_url
    if "?" in rtsp_url:
        return rtsp_url + "&tcp"
    return rtsp_url + "?tcp"


def log_debug(msg):
    try:
        with open("debug_video.log", "a", encoding="utf-8") as f:
            f.write(f"{time.ctime()} - {msg}\n")
    except:
        pass

def open_capture(rtsp_url: str):
    """
    Open video source with Fallback Strategy:
    1. Webcam Index (e.g. "0") -> cv2.CAP_DSHOW
    2. RTSP -> Try TCP first, then UDP/Default
    3. Files/HTTP -> Default
    """
    log_debug(f"Attempting to open: '{rtsp_url}' (Type: {type(rtsp_url)})")
    
    # 1. Webcam Index (e.g. "0")
    if str(rtsp_url).strip().isdigit():
        idx = int(str(rtsp_url).strip())
        log_debug(f"Opening as Webcam Index: {idx} with CAP_DSHOW")
        return cv2.VideoCapture(idx, cv2.CAP_DSHOW)

    # 2. RTSP Streams
    if str(rtsp_url).lower().startswith("rtsp"):
        normalized = normalize_rtsp_url(rtsp_url)
        
        # Strategy A: Internal TCP (Preferred)
        url_tcp = add_tcp_param(normalized)
        log_debug(f"Strategy A: Opening RTSP (TCP): {url_tcp}")
        
        # Set a shorter timeout for the first attempt if possible
        # Note: os.environ is global, so we rely on URL param mostly
        cap = cv2.VideoCapture(url_tcp, cv2.CAP_FFMPEG)
        
        if cap.isOpened():
            log_debug("Strategy A: Success")
            return cap
        else:
            log_debug("Strategy A: Failed. Retrying with Strategy B (UDP/Default)...")
            cap.release()
            
            # Strategy B: Default / UDP
            log_debug(f"Strategy B: Opening RTSP (Default): {normalized}")
            cap_udp = cv2.VideoCapture(normalized, cv2.CAP_FFMPEG)
            
            if cap_udp.isOpened():
                 log_debug("Strategy B: Success")
            else:
                 log_debug("Strategy B: Failed")
            
            return cap_udp

    # 3. Everything else (HTTP, Files)
    log_debug(f"Opening as Generic Source")
    return cv2.VideoCapture(rtsp_url)


def encode_jpeg(frame):
    """Encode JPEG with limited quality for lighter streaming."""
    ok, buf = cv2.imencode(
        ".jpg",
        frame,
        [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY],
    )
    if not ok:
        return None
    return buf.tobytes()

# ==========================================
# ⚡ THREADED CAMERA READER
# ==========================================
class ThreadedCamera:
    """
    Reads frames in a separate thread to always ensure the 
    latest frame is available. Solves the 'growing buffer' latency issue.
    """
    def __init__(self, src):
        self.src = src
        self.cap = open_capture(src)
        self.frame = None
        self.ret = False
        self.stopped = False
        self.lock = threading.Lock()
        self.fail_count = 0
        
        # Initial read
        if self.cap.isOpened():
            self.ret, self.frame = self.cap.read()
        
    def start(self):
        t = threading.Thread(target=self.update, args=(), daemon=True)
        t.start()
        return self

    def update(self):
        while not self.stopped:
            if not self.cap.isOpened():
                time.sleep(0.5)
                # Try reconnecting
                self.cap.release()
                self.cap = open_capture(self.src)
                if not self.cap.isOpened():
                    self.fail_count += 1
                    continue
                else:
                    self.fail_count = 0
            
            # Read latest frame
            ret, frame = self.cap.read()
            
            with self.lock:
                if ret:
                    self.ret = ret
                    self.frame = frame
                    self.fail_count = 0
                else:
                    self.ret = False
                    self.fail_count += 1
                    
            # Prevent busy loop if camera is dead
            if not ret:
                time.sleep(0.1)

    def read(self):
        with self.lock:
            return self.ret, self.frame

    def stop(self):
        self.stopped = True
        if self.cap:
            self.cap.release()

    def is_opened(self):
        return self.cap.isOpened()
        
    def get_fail_count(self):
        return self.fail_count


# ==========================================
# 🎥 MAIN AI STREAM GENERATOR
# ==========================================
def generate_stream(camera_id: str, db: Session):
    """
    Stream a single camera with YOLO overlay and event logging.
    Re-checks is_active flag and listens to global stop_event.
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
        print(f"🚫 Camera {camera_id} offline/inactive")
        yield create_error_frame(f"OFFLINE: {camera_id}")
        return

    rtsp_url = cam.rtsp_url
    print(f"📡 [AI Stream] Connecting to {camera_id}...")

    # Start Threaded Reader
    video_thread = ThreadedCamera(rtsp_url).start()
    
    if not video_thread.is_opened():
        print(f"❌ Failed to open Source for {camera_id}")
        video_thread.stop()
        yield create_error_frame("CONNECTION FAILED")
        return

    frame_count = 0
    cached_boxes = []

    # Track stats for the current frame
    current_person_count = 0
    current_phone_count = 0
    current_best_conf = 0.0
    current_anomaly = None

    last_sent_time = 0.0
    
    try:
        while True:
            # 🛑 1) CHECK FOR SERVER SHUTDOWN (Ctrl+C)
            if server_stop_event and server_stop_event.is_set():
                break

            # 🛑 2) CHECK CAMERA ACTIVE FLAG
            # (Optimization: Check DB less frequently? For now leaving as is for responsiveness)
            # To reduce DB load, check every 30 frames
            if frame_count % 30 == 0:
                 cam_state = (
                     db.query(models.Camera.is_active)
                     .filter(models.Camera.camera_id == camera_id)
                     .first()
                 )
                 if not cam_state or not cam_state[0]:
                     print(f"🚫 Camera {camera_id} disabled by user.")
                     break
            
            # 3) GET LATEST FRAME
            if video_thread.get_fail_count() > MAX_CONSECUTIVE_FAILS:
                 print(f"⚠️ {camera_id} connection lost.")
                 video_thread.stop()
                 yield create_error_frame("CONNECTION LOST")
                 return
                 
            success, raw_frame = video_thread.read()
            
            if not success or raw_frame is None:
                # Thread might be reconnecting, just wait a tiny bit
                time.sleep(0.01)
                continue

            # Clone to avoid threading issues if we modify it
            frame = raw_frame.copy()
            frame = cv2.resize(frame, STREAM_RESOLUTION)
            frame_count += 1

            # ---------------------------------------------------------
            # 4. AI INFERENCE (Runs periodically)
            # ---------------------------------------------------------
            if frame_count % FRAME_SKIP == 0:
                cached_boxes = []
                current_person_count = 0
                current_phone_count = 0
                current_best_conf = 0.0
                current_anomaly = None

                # Call the refactored detector
                detections = detector.detect(frame)

                for (x1, y1, x2, y2, label_type, conf) in detections:
                    if label_type == "phone":
                        color = COLOR_RED
                        label = f"Phone {conf:.2f}"
                        current_phone_count += 1
                        current_best_conf = max(current_best_conf, conf)
                    elif label_type == "person":
                        color = COLOR_GREEN
                        label = f"Person {conf:.2f}"
                        current_person_count += 1
                        current_best_conf = max(current_best_conf, conf)
                    else:
                        continue # Should not happen based on detector logic

                    cached_boxes.append((x1, y1, x2, y2, color, label))

                # Determine event type
                if current_phone_count > 0:
                    current_anomaly = "mobile_phone"
                elif current_person_count > 0:
                    current_anomaly = "intrusion"

            # ---------------------------------------------------------
            # 5. DRAW BOXES
            # ---------------------------------------------------------
            for (x1, y1, x2, y2, color, label) in cached_boxes:
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                t_size = cv2.getTextSize(
                    label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2
                )[0]
                cv2.rectangle(
                    frame,
                    (x1, y1 - 20),
                    (x1 + t_size[0], y1),
                    color,
                    -1,
                )
                cv2.putText(
                    frame,
                    label,
                    (x1, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    COLOR_TEXT,
                    2,
                )

            # ---------------------------------------------------------
            # 6. SAVE SNAPSHOT (only when anomaly + cooldown)
            # ---------------------------------------------------------
            now = time.time()
            last_time = last_event_time.get(camera_id, 0.0)

            if (
                (frame_count % FRAME_SKIP == 0)
                and current_anomaly
                and (now - last_time > EVENT_COOLDOWN)
            ):
                filename = f"{camera_id}_{int(now)}.jpg"
                save_path = MEDIA_DIR / filename

                cv2.imwrite(str(save_path), frame)

                new_event = models.Event(
                    camera_id=camera_id,
                    event_type=current_anomaly,
                    confidence=current_best_conf,
                    description=(
                        f"Detected: {current_person_count} Persons, "
                        f"{current_phone_count} Phones"
                    ),
                    image_path=f"media/{filename}",
                )
                db.add(new_event)
                db.commit()

                last_event_time[camera_id] = now
                print(f"📸 Snapshot saved with boxes: {filename}")

            # ---------------------------------------------------------
            # 7. STREAM TO BROWSER (FPS LIMITED)
            # ---------------------------------------------------------
            now = time.time()
            elapsed = now - last_sent_time
            if elapsed < FRAME_INTERVAL:
                time.sleep(FRAME_INTERVAL - elapsed)
            last_sent_time = time.time()

            info = (
                f"Cam: {camera_id} | Persons: {current_person_count} "
                f"| Phones: {current_phone_count}"
            )
            cv2.putText(
                frame,
                info,
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                COLOR_GREEN,
                2,
            )

            jpeg_bytes = encode_jpeg(frame)
            if jpeg_bytes is None:
                continue

            try:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" +
                    jpeg_bytes +
                    b"\r\n"
                )
            except GeneratorExit:
                print(f"👋 Client disconnected from {camera_id}")
                break
            except Exception:
                print(f"⚠️ Pipe error for {camera_id}, stopping stream.")
                break

    except Exception as e:
        print(f"💥 Stream crashed: {e}")
        traceback.print_exc()
        yield create_error_frame("SERVER ERROR")
    finally:
        cap.release()
        print(f"🛑 Stream released: {camera_id}")


# ==========================================
# 🔍 RAW STREAM (NO AI) FOR TESTING / DEBUG
# ==========================================
def generate_raw_stream(camera_id: str, db: Session):
    """
    Lighter stream without YOLO for debugging performance.
    """
    camera_id = camera_id.strip()
    cam = (
        db.query(models.Camera)
        .filter(models.Camera.camera_id == camera_id)
        .first()
    )
    if not cam or not cam.is_active:
        print(f"🚫 Camera {camera_id} offline/inactive (raw)")
        yield create_error_frame(f"OFFLINE: {camera_id}")
        return

    rtsp_url = cam.rtsp_url
    print(f"📡 [RAW Stream] Connecting to {camera_id} at {rtsp_url}...")

    cap = open_capture(rtsp_url)
    if not cap.isOpened():
        print(f"❌ Failed to open RTSP for {camera_id} (raw)")
        yield create_error_frame("CONNECTION FAILED")
        return

    last_sent_time = 0.0
    fail_count = 0

    try:
        while True:
            if server_stop_event and server_stop_event.is_set():
                print(f"🛑 Shutdown signal – raw stream {camera_id}")
                break

            success, frame = cap.read()
            if not success:
                fail_count += 1
                if fail_count < MAX_CONSECUTIVE_FAILS:
                    continue

                print(f"⚠️ Lost connection (raw {camera_id}), reconnecting...")
                cap.release()
                time.sleep(0.5)
                cap = open_capture(rtsp_url)
                if not cap.isOpened():
                    time.sleep(1)
                    continue
                else:
                    print(f"✅ Reconnected (raw {camera_id})")
                    fail_count = 0
                    continue
            else:
                fail_count = 0

            frame = cv2.resize(frame, STREAM_RESOLUTION)

            # FPS limiting for smooth playback
            now = time.time()
            elapsed = now - last_sent_time
            if elapsed < FRAME_INTERVAL:
                time.sleep(FRAME_INTERVAL - elapsed)
            last_sent_time = time.time()

            jpeg_bytes = encode_jpeg(frame)
            if jpeg_bytes is None:
                continue

            try:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" +
                    jpeg_bytes +
                    b"\r\n"
                )
            except GeneratorExit:
                print(f"👋 Client disconnected from raw {camera_id}")
                break
            except Exception:
                print(f"⚠️ Pipe error on raw {camera_id}")
                break
    finally:
        cap.release()
        print(f"🛑 Raw stream released: {camera_id}")


# ==========================================
# 🛣️ ROUTES
# ==========================================
@router.get("/video/stream/{camera_id}")
def video_stream_endpoint(camera_id: str, db: Session = Depends(get_db)):
    """AI-processed stream with overlays & event logging."""
    return StreamingResponse(
        generate_stream(camera_id, db),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.get("/video/raw/{camera_id}")
def raw_video_stream_endpoint(camera_id: str, db: Session = Depends(get_db)):
    """
    Raw stream without YOLO for debugging.
    Open in browser: http://127.0.0.1:8000/video/raw/{camera_id}
    """
    return StreamingResponse(
        generate_raw_stream(camera_id, db),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

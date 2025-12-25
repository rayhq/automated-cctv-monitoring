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

from app.core.database import SessionLocal
from app.models import all_models as models
from app.services.detection import ObjectDetector
import app.api.endpoints.settings as settings_module

router = APIRouter()

# ==========================================
# 🔧 GLOBAL FFMPEG / RTSP SETTINGS
# ==========================================
# Aggressive Low Latency Settings
# ==========================================
# 🔧 GLOBAL FFMPEG / RTSP SETTINGS
# ==========================================
# (Cleared custom flags to ensure compatibility)
# os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = ... 

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
FRAME_SKIP = 3
STREAM_RESOLUTION = (640, 360)
EVENT_COOLDOWN = 15.0

JPEG_QUALITY = 40            # Aggressive compression for speed
MAX_CONSECUTIVE_FAILS = 30

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

def verify_capture(cap):
    """
    Reads one frame to ensure the connection effectively transmits video.
    Returns True if a frame is read successfully.
    """
    if not cap.isOpened():
        return False
    try:
        # Try to read one frame to confirm stream is alive
        ret, _ = cap.read()
        return ret
    except:
        return False

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
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if cap.isOpened():
             cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap

    # 2. RTSP Streams
    if str(rtsp_url).lower().startswith("rtsp"):
        normalized = normalize_rtsp_url(rtsp_url)
        
        # Strategy A: TCP (Prioritized for Speed & Reliability)
        # We use the clean URL but force TCP via environment variable.
        # Modified: Removed ?tcp suffix injection to avoid 404 errors.
        log_debug(f"Strategy A: Opening RTSP (TCP): {normalized}")
        
        # Force TCP + Low Latency Flags (Speed Mode)
        # We try aggressive no-buffer settings first.
        # If this fails verify_capture(), we fall back to Strategy B.
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
            "rtsp_transport;tcp|"
            "fflags;nobuffer|"
            "flags;low_delay|"
            "max_delay;0|"
            "timeout;3000000"
        )
        
        cap = cv2.VideoCapture(normalized, cv2.CAP_FFMPEG)
        if verify_capture(cap):
             cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
             log_debug("Strategy A: Success (Verified)")
             # We Keep the env var? No, better to clear it to avoid leaking to other captures?
             # actually, if we keep it, it persists for this capture session in C++? 
             # It's safer to clear it.
             if "OPENCV_FFMPEG_CAPTURE_OPTIONS" in os.environ:
                del os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"]
             return cap
        else:
             log_debug("Strategy A (TCP) Failed Verification. Retrying UDP/Default...")
             cap.release()
             
             # Strategy B: Clean try (UDP/Default)
             if "OPENCV_FFMPEG_CAPTURE_OPTIONS" in os.environ:
                del os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"]

             # Ensure fallback doesn't inherit the TCP flag
             os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "timeout;5000000"

             cap = cv2.VideoCapture(normalized, cv2.CAP_FFMPEG)
             if verify_capture(cap):
                  cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                  log_debug("Strategy B: Success (Verified)")
                  if "OPENCV_FFMPEG_CAPTURE_OPTIONS" in os.environ:
                      del os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"]
                  return cap
             
             log_debug("Strategy B: Failed Verification")
             if "OPENCV_FFMPEG_CAPTURE_OPTIONS" in os.environ:
                  del os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"]
             return cap

    # 3. Everything else (HTTP, Files)
    log_debug(f"Opening as Generic Source")
    cap = cv2.VideoCapture(rtsp_url)
    if cap.isOpened():
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return cap


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
    # ==========================================
# ⚡ THREADED CAMERA READER
# ==========================================
class ThreadedCamera:
    """
    Reads frames in a separate thread to always ensure the 
    latest frame is available. Solves the 'growing buffer' latency issue.
    Async/Non-blocking initialization to prevent API hangs.
    """
    def __init__(self, src):
        self.src = src
        self.cap = None # Initialize as None, connect in thread
        self.frame = None
        self.ret = False
        self.stopped = False
        self.lock = threading.Lock()
        self.fail_count = 0
        self.started = False
        
    def start(self):
        t = threading.Thread(target=self.update, args=(), daemon=True)
        t.start()
        return self

    def update(self):
        # 1. Initial Connection (Background)
        log_debug(f"ThreadedCamera: Background connecting to {self.src}...")
        self.cap = open_capture(self.src)
        self.started = True
        
        while not self.stopped:
            # Reconnection Logic
            if self.cap is None or not self.cap.isOpened():
                if self.cap:
                    self.cap.release()
                time.sleep(1.0) # Wait before reconnect
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
        return self.cap is not None and self.cap.isOpened()
        
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
    video_thread = None

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

    # Start Threaded Reader (Non-blocking now)
    video_thread = ThreadedCamera(rtsp_url).start()
    
    # We no longer fail immediately. We wait for the thread to connect.
    # Yielding a 'Loading' frame initially is good UX.
    
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
                # If starting up, show LOADING
                if frame_count == 0:
                    current_time = time.time()
                    if (current_time - last_sent_time) > 1.0:
                         yield create_error_frame("LOADING...")
                         last_sent_time = current_time
                    time.sleep(0.1)
                    continue

                # Thread might be reconnecting during stream
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

                # 🚀 Trigger Notification (Non-blocking ideally, but calling directly for now)
                try:
                    # Reload settings to get latest config
                    current_settings = settings_module.load_settings()
                    from app.services.notifications import send_discord_notification
                    send_discord_notification(new_event, current_settings)
                except Exception as e:
                    print(f"⚠️ Notification error: {e}")


            # ---------------------------------------------------------
            # 7. STREAM TO BROWSER (UNLIMITED FPS)
            # ---------------------------------------------------------
            # removed sleep for max throughput

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
        if video_thread:
            video_thread.stop()
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

            # FPS limiting removed for raw speed

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

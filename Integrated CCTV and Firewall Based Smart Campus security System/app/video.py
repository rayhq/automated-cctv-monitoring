import cv2
import numpy as np
from collections import defaultdict, deque
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VideoProcessor:
    """
    Advanced video processor with AI-powered recognition capabilities.
    Features: Face recognition, object detection, eye tracking, person tracking.
    """
    
    def __init__(self, video_source=0, enable_face_detection=True, 
                 enable_object_detection=True, enable_eye_tracking=True,
                 enable_person_tracking=True):
        """
        Initialize the video processor with AI capabilities.
        
        Args:
            video_source: Video source (camera index or video file path)
            enable_face_detection: Enable face detection
            enable_object_detection: Enable object detection
            enable_eye_tracking: Enable eye tracking
            enable_person_tracking: Enable person tracking
        """
        self.video_source = video_source
        self.camera = cv2.VideoCapture(self.video_source)
        self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.camera.set(cv2.CAP_PROP_FPS, 30)
        
        # Initialize cascade classifiers for face and eye detection
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        self.eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )
        
        # HOG descriptor for person detection
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        
        # Tracking features
        self.person_tracker = PersonTracker()
        self.frame_count = 0
        self.detections_history = defaultdict(list)
        
        # Enable/disable features
        self.enable_face_detection = enable_face_detection
        self.enable_object_detection = enable_object_detection
        self.enable_eye_tracking = enable_eye_tracking
        self.enable_person_tracking = enable_person_tracking
        
        # Current detection results
        self.current_detections = {
            'faces': [],
            'eyes': [],
            'persons': [],
            'timestamp': None,
            'frame_id': 0
        }

    def get_frame(self, include_overlays=True):
        """
        Get processed frame with AI detection overlays.
        
        Args:
            include_overlays: Whether to draw detection overlays on frame
            
        Returns:
            JPEG encoded frame bytes
        """
        success, frame = self.camera.read()
        if not success:
            return None
        
        self.frame_count += 1
        self.current_detections['frame_id'] = self.frame_count
        self.current_detections['timestamp'] = datetime.now().isoformat()
        
        # Convert to grayscale for detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Perform detections
        if self.enable_face_detection:
            self._detect_faces(frame, gray, include_overlays)
        
        if self.enable_person_tracking:
            self._detect_persons(frame, gray, include_overlays)
        
        if self.enable_eye_tracking and self.current_detections['faces']:
            self._detect_eyes(frame, gray, include_overlays)
        
        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame)
        return buffer.tobytes()

    def _detect_faces(self, frame, gray, draw_overlays=True):
        """Detect faces using Haar Cascade classifier."""
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        self.current_detections['faces'] = []
        
        for (x, y, w, h) in faces:
            face_data = {
                'x': int(x),
                'y': int(y),
                'width': int(w),
                'height': int(h),
                'confidence': 0.85,  # Placeholder confidence
                'timestamp': datetime.now().isoformat()
            }
            self.current_detections['faces'].append(face_data)
            
            if draw_overlays:
                # Draw rectangle around face
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                # Label
                cv2.putText(frame, 'Face', (x, y-10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # Store in history
            self.detections_history['faces'].append(face_data)
            if len(self.detections_history['faces']) > 100:
                self.detections_history['faces'].pop(0)

    def _detect_persons(self, frame, gray, draw_overlays=True):
        """Detect persons using HOG descriptor."""
        persons, weights = self.hog.detectMultiScale(
            gray,
            winStride=(8, 8),
            padding=(16, 16),
            scale=1.05
        )
        
        self.current_detections['persons'] = []
        
        # Suppress overlapping detections
        persons = self._apply_non_max_suppression(persons, weights)
        
        for (x, y, w, h), confidence in zip(persons, weights):
            person_data = {
                'x': int(x),
                'y': int(y),
                'width': int(w),
                'height': int(h),
                'confidence': float(confidence),
                'timestamp': datetime.now().isoformat()
            }
            self.current_detections['persons'].append(person_data)
            
            # Update person tracker
            if self.enable_person_tracking:
                self.person_tracker.update([person_data])
            
            if draw_overlays:
                # Draw rectangle around person
                cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
                # Label with confidence
                label = f'Person ({confidence:.2f})'
                cv2.putText(frame, label, (x, y-10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
            
            # Store in history
            self.detections_history['persons'].append(person_data)
            if len(self.detections_history['persons']) > 500:
                self.detections_history['persons'].pop(0)

    def _detect_eyes(self, frame, gray, draw_overlays=True):
        """Detect eyes in detected faces."""
        self.current_detections['eyes'] = []
        
        for face in self.current_detections['faces']:
            x, y, w, h = face['x'], face['y'], face['width'], face['height']
            roi_gray = gray[y:y+h, x:x+w]
            
            eyes = self.eye_cascade.detectMultiScale(roi_gray)
            
            for (ex, ey, ew, eh) in eyes[:2]:  # Detect up to 2 eyes
                eye_data = {
                    'x': int(x + ex),
                    'y': int(y + ey),
                    'width': int(ew),
                    'height': int(eh),
                    'face_id': len(self.current_detections['faces']) - 1,
                    'timestamp': datetime.now().isoformat()
                }
                self.current_detections['eyes'].append(eye_data)
                
                if draw_overlays:
                    # Draw circles around eyes
                    eye_center = (x + ex + ew // 2, y + ey + eh // 2)
                    radius = max(ew, eh) // 2
                    cv2.circle(frame, eye_center, radius, (0, 255, 255), 2)
                
                self.detections_history['eyes'].append(eye_data)
                if len(self.detections_history['eyes']) > 200:
                    self.detections_history['eyes'].pop(0)

    def _apply_non_max_suppression(self, boxes, weights, overlap_thresh=0.5):
        """Apply non-maximum suppression to remove overlapping detections."""
        if len(boxes) == 0:
            return []
        
        boxes = np.array(boxes, dtype=np.float32)
        weights = np.array(weights, dtype=np.float32)
        
        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        x2 = x1 + boxes[:, 2]
        y2 = y1 + boxes[:, 3]
        
        area = (x2 - x1 + 1) * (y2 - y1 + 1)
        idxs = np.argsort(weights)
        
        keep = []
        while len(idxs) > 0:
            last = len(idxs) - 1
            i = idxs[last]
            keep.append(i)
            
            xx1 = np.maximum(x1[i], x1[idxs[:last]])
            yy1 = np.maximum(y1[i], y1[idxs[:last]])
            xx2 = np.minimum(x2[i], x2[idxs[:last]])
            yy2 = np.minimum(y2[i], y2[idxs[:last]])
            
            w = np.maximum(0, xx2 - xx1 + 1)
            h = np.maximum(0, yy2 - yy1 + 1)
            overlap = (w * h) / area[idxs[:last]]
            
            idxs = np.delete(idxs, np.concatenate(([last], np.where(overlap > overlap_thresh)[0])))
        
        return [(boxes[i], weights[i]) for i in keep]

    def get_detections(self):
        """Get current detections data."""
        return self.current_detections.copy()

    def get_detection_history(self, detection_type='all', limit=100):
        """
        Get detection history.
        
        Args:
            detection_type: Type of detections to retrieve ('faces', 'persons', 'eyes', 'all')
            limit: Maximum number of entries to return
            
        Returns:
            Dictionary with detection history
        """
        if detection_type == 'all':
            return {k: v[-limit:] for k, v in self.detections_history.items()}
        else:
            return {detection_type: self.detections_history.get(detection_type, [])[-limit:]}

    def get_statistics(self):
        """Get statistics about detections."""
        return {
            'total_frames': self.frame_count,
            'total_faces_detected': len(self.detections_history.get('faces', [])),
            'total_persons_detected': len(self.detections_history.get('persons', [])),
            'total_eyes_detected': len(self.detections_history.get('eyes', [])),
            'current_faces': len(self.current_detections.get('faces', [])),
            'current_persons': len(self.current_detections.get('persons', [])),
            'tracked_persons': self.person_tracker.get_active_tracks()
        }

    def release(self):
        """Release video capture resources."""
        self.camera.release()


class PersonTracker:
    """Simple person tracker using centroid tracking."""
    
    def __init__(self, max_disappeared=50):
        """
        Initialize person tracker.
        
        Args:
            max_disappeared: Max frames a person can disappear before being deregistered
        """
        self.next_object_id = 0
        self.objects = {}  # {id: centroid}
        self.disappeared = defaultdict(int)
        self.max_disappeared = max_disappeared
        self.track_history = defaultdict(deque)

    def update(self, detections):
        """
        Update tracker with new detections.
        
        Args:
            detections: List of detection dictionaries with x, y, width, height
        """
        if len(detections) == 0:
            # Mark all objects as disappeared
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self._deregister(object_id)
            return
        
        # Calculate centroids for current detections
        input_centroids = []
        for detection in detections:
            cx = detection['x'] + detection['width'] // 2
            cy = detection['y'] + detection['height'] // 2
            input_centroids.append((cx, cy))
        
        # If no existing objects, register all detections
        if len(self.objects) == 0:
            for i, centroid in enumerate(input_centroids):
                self._register(self.next_object_id, centroid)
                self.next_object_id += 1
        else:
            # Match detections to existing objects
            object_ids = list(self.objects.keys())
            object_centroids = list(self.objects.values())
            
            # Simple distance-based matching
            for object_id, object_centroid in zip(object_ids, object_centroids):
                if len(input_centroids) > 0:
                    # Find closest detection
                    distances = [self._distance(object_centroid, ic) for ic in input_centroids]
                    nearest = np.argmin(distances)
                    
                    if distances[nearest] < 50:  # Distance threshold
                        self.objects[object_id] = input_centroids[nearest]
                        self.disappeared[object_id] = 0
                        self.track_history[object_id].append(input_centroids[nearest])
                        input_centroids.pop(nearest)
                
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self._deregister(object_id)
            
            # Register remaining detections
            for centroid in input_centroids:
                self._register(self.next_object_id, centroid)
                self.next_object_id += 1

    def _register(self, object_id, centroid):
        """Register a new object."""
        self.objects[object_id] = centroid
        self.disappeared[object_id] = 0
        self.track_history[object_id].append(centroid)

    def _deregister(self, object_id):
        """Deregister an object."""
        del self.objects[object_id]
        del self.disappeared[object_id]

    def get_active_tracks(self):
        """Get number of active tracked persons."""
        return len(self.objects)

    @staticmethod
    def _distance(p1, p2):
        """Calculate Euclidean distance between two points."""
        return np.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)

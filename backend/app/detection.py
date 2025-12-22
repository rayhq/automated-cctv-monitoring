import logging
from typing import List, Tuple, Optional
import numpy as np
from ultralytics import YOLO

# Configure logging
logger = logging.getLogger(__name__)

class ObjectDetector:
    def __init__(self, model_path: str = "yolov8n.pt", conf_threshold: float = 0.4):
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.model = None
        self.phone_class_ids = []
        self.person_class_ids = []
        self._load_model()

    def _load_model(self):
        """Load the YOLO model and identify class IDs for people and phones."""
        logger.info(f"🔁 Loading YOLOv8 model ({self.model_path})...")
        try:
            self.model = YOLO(self.model_path)
            logger.info("✅ YOLOv8 model loaded successfully.")

            # Identify relevant class IDs from the model's names
            self.phone_class_ids = [
                id for id, name in self.model.names.items() 
                if "phone" in str(name).lower()
            ]
            self.person_class_ids = [
                id for id, name in self.model.names.items() 
                if "person" in str(name).lower()
            ]
        except Exception as e:
            logger.error(f"🔥 Error loading model: {e}")
            self.model = None
            self.phone_class_ids = []
            self.person_class_ids = []

    def detect(self, frame: np.ndarray) -> List[Tuple[int, int, int, int, str, float]]:
        """
        Run inference on a frame and return a list of detections.
        
        Returns:
            List of tuples: (x1, y1, x2, y2, class_name, confidence)
            class_name will be 'phone' or 'person'
        """
        if self.model is None:
            return []

        results = self.model(frame, conf=self.conf_threshold, verbose=False)
        detections = []

        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                
                label = None
                if cls_id in self.phone_class_ids:
                    label = "phone"
                elif cls_id in self.person_class_ids:
                    label = "person"
                
                if label:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    detections.append((x1, y1, x2, y2, label, conf))
        
        return detections

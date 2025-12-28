import logging
from typing import List, Tuple, Optional
import numpy as np
from ultralytics import YOLO

# Configure logging
logger = logging.getLogger(__name__)

class ObjectDetector:
    def __init__(self, model_path: str = "ai_models/yolov8n.pt", conf_threshold: float = 0.4):
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.model = None
        self.device = 'cpu' # Default to CPU
        self.phone_class_ids = []
        self.person_class_ids = []
        self._load_model()

    def _load_model(self):
        """Load the YOLO model and identify class IDs for people and phones."""
        logger.info(f"🔁 Loading YOLOv8 model ({self.model_path})...")
        try:
            self.model = YOLO(self.model_path)
            
            # 🚀 Auto-detect Device: Try GPU first
            try:
                import torch
                if torch.cuda.is_available():
                    logger.info(f"✅ CUDA Detected: {torch.cuda.get_device_name(0)}")
                    self.device = 0
                else:
                    logger.warning("⚠️ CUDA not available, falling back to CPU.")
                    self.device = 'cpu'
            except ImportError:
                logger.warning("⚠️ Torch not found (how?), using CPU.")
                self.device = 'cpu'
            except Exception as e:
                logger.warning(f"⚠️ Error checking CUDA: {e}. Using CPU.")
                self.device = 'cpu'

            logger.info(f"🚀 Object Detector initialized on device: {self.device}")

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
            self.device = 'cpu'

    def detect(self, frame: np.ndarray) -> List[Tuple[int, int, int, int, str, float]]:
        """
        Run inference on a frame and return a list of detections.
        """
        if self.model is None:
            return []

        # Use the determined device
        try:
            results = self.model(frame, conf=self.conf_threshold, verbose=False, device=self.device)
        except Exception as e:
            # Fallback on runtime error (e.g. CUDA OOM of sudden failure)
            if self.device != 'cpu':
                print(f"⚠️ GPU Inference failed ({e}). Switching to CPU.")
                self.device = 'cpu'
                results = self.model(frame, conf=self.conf_threshold, verbose=False, device='cpu')
            else:
                return []
                
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

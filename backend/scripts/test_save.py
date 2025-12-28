import cv2
import numpy as np
import os
from pathlib import Path

# Setup paths similar to video.py
BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BASE_DIR / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

print(f"Testing save to: {MEDIA_DIR}")

# Create dummy frame
frame = np.zeros((360, 640, 3), dtype=np.uint8)
# Add some text
cv2.putText(frame, "TEST SAVE", (50, 180), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 255, 255), 3)

# Filename
filename = "TEST_MANUAL_SAVE.jpg"
save_path = MEDIA_DIR / filename

print(f"Saving to: {save_path}")

try:
    success = cv2.imwrite(str(save_path), frame)
    if success:
        print(f"✅ SUCCESS: Image saved to {save_path}")
        # Verify existence
        if save_path.exists():
            print(f"✅ VERIFIED: File exists on disk. Size: {save_path.stat().st_size} bytes")
        else:
            print(f"❌ ERROR: cv2 returned True but file NOT FOUND.")
    else:
        print(f"❌ FAILURE: cv2.imwrite returned False.")
except Exception as e:
    print(f"❌ EXCEPTION: {e}")

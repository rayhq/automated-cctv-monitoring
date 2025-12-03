import cv2

class VideoProcessor:
    def __init__(self, video_source=0):
        self.video_source = video_source
        self.camera = cv2.VideoCapture(self.video_source)

    def get_frame(self):
        success, frame = self.camera.read()
        if not success:
            return None
        
        ret, buffer = cv2.imencode('.jpg', frame)
        return buffer.tobytes()

    def release(self):
        self.camera.release()

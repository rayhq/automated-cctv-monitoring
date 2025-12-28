import subprocess
import threading
import time
import numpy as np
import os
import signal
import re

class FFmpegStreamer:
    """
    High-performance video reader using FFmpeg subprocess pipes.
    Optimized for low-latency RTSP streaming.
    """
    def __init__(self, rtsp_url, width=640, height=360):
        self.rtsp_url = rtsp_url
        self.width = width
        self.height = height
        self.frame_size = width * height * 3
        self.pipe = None
        self.running = False
        
    def start(self):
        """Start the FFmpeg subprocess."""
        if self.running:
            return
            
        # Command for Low Latency
        # -rtsp_transport tcp: Reliable transport
        # -fflags nobuffer: Reduce lag
        # -flags low_delay: Minimize decode delay
        command = [
            'ffmpeg',
            '-hide_banner',
            '-loglevel', 'error',
            '-rtsp_transport', 'tcp',
            '-i', self.rtsp_url,
            '-f', 'image2pipe',
            '-pix_fmt', 'bgr24',
            '-vcodec', 'rawvideo',
            '-s', f'{self.width}x{self.height}',  # Resize directly in FFmpeg
            '-an', '-sn',               # No audio, no subs
            '-fflags', 'nobuffer',
            '-flags', 'low_delay',
            '-'
        ]
        
        try:
            # Use bufsize=0 for unbuffered reading (critical for latency)
            self.pipe = subprocess.Popen(
                command, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                bufsize=10**7 # Large enough buffer to prevent pipe blocking, but handled manually
            )
            self.running = True
            print(f"🚀 FFmpeg Pipeline Started: {self.rtsp_url}")
        except FileNotFoundError:
            print("❌ FFmpeg not found! Please install ffmpeg to path.")
            self.running = False
            
    def read(self):
        """
        Read a single frame from the pipe.
        Returns (True, frame) or (False, None).
        """
        if not self.running or not self.pipe:
            return False, None
            
        try:
            # Read exact bytes for one frame
            raw_image = self.pipe.stdout.read(self.frame_size)
            
            if len(raw_image) != self.frame_size:
                # Pipe broken or partial frame
                return False, None
                
            # Convert string buffer to numpy array
            image = np.frombuffer(raw_image, dtype='uint8')
            image = image.reshape((self.height, self.width, 3))
            
            # Flush buffer if it's getting too big? 
            # FFmpeg push model means we must read as fast as it pushes.
            
            return True, image
        except Exception as e:
            print(f"⚠️ Pipeline Read Error: {e}")
            return False, None

    def stop(self):
        """Terminate the subprocess."""
        self.running = False
        if self.pipe:
            try:
                # Windows-safe kill
                self.pipe.terminate()
                # self.pipe.kill() 
                self.pipe.wait(timeout=1)
            except:
                pass
            self.pipe = None
        print("🛑 FFmpeg Pipeline Stopped")

    @staticmethod
    def get_resolution(rtsp_url):
        """Probe the stream resolution using ffprobe."""
        try:
            command = [
                'ffprobe', 
                '-v', 'error', 
                '-select_streams', 'v:0', 
                '-show_entries', 'stream=width,height', 
                '-of', 'csv=s=x:p=0', 
                rtsp_url
            ]
            output = subprocess.check_output(command).decode('utf-8').strip()
            w, h = map(int, output.split('x'))
            return w, h
        except:
            return 640, 360 # Default fallback

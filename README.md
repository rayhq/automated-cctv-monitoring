# 🦅 Automated CCTV Monitoring System

![Project Status](https://img.shields.io/badge/Status-Active-emerald)
![Python](https://img.shields.io/badge/Backend-Python_3.11_%7C_FastAPI-blue?logo=python)
![Frontend](https://img.shields.io/badge/Frontend-React_%7C_Vite_%7C_Tailwind-cyan?logo=react)
![AI](https://img.shields.io/badge/AI-YOLOv8_%7C_CUDA_Enabled-purple?logo=nvidia)

A professional-grade, AI-powered surveillance system designed for real-time monitoring. It uses advanced computer vision to detect people and security events, offering a premium "Apple-style" dashboard for management.

## ✨ Key Features

-   **🧠 Advanced A.I. Core**:
    -   Powered by **YOLOv8** (Object Detection) & **PyTorch**.
    -   **GPU Accelerated** (NVIDIA CUDA) for lightning-fast inference.
    -   Detects **Persons** and **Cell Phones** in real-time.

-   **⚡ High-Performance Streaming**:
    -   **Zero-Lag** MJPEG Streaming over WebSocket/HTTP.
    -   **Universal Balanced Profile**: Optimized 480p @ 60fps for compatibility with RTX 3050/4060 and standard Wi-Fi.
    -   **Smart Resume**: Instantly re-syncs video when switching tabs to prevent buffering lag.

-   **🖥️ Modern Dashboard**:
    -   **Glassmorphism UI**: Beautiful, dark-mode interface with neon accents.
    -   **Draggable Grid**: Reorder camera lists easily.
    -   **Live Stats**: Real-time server load, active cameras, and event counters.

-   **📱 Mobile Integration**:
    -   **Phone-as-Camera**: Turn any Android/iOS phone into a wireless network camera.
    -   **Responsive Design**: Dashboard works flawlessly on mobile browsers.

## 🚀 Installation

### Prerequisites
-   **Python 3.11** (Required for Torch/CUDA 12.1 compatibility)
-   **Node.js** (v18+)
-   **NVIDIA GPU** (Recommended for AI features)

### 1. Clone & Backend Setup
```bash
git clone https://github.com/yourusername/automated-cctv-monitoring.git
cd automated-cctv-monitoring/backend

# Create Virtual Env
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install Dependencies (includes PyTorch CUDA)
pip install -r requirements.txt
```

### 2. Frontend Setup
```bash
cd ../frontend
npm install
```

## 🏃‍♂️ Usage

### Start Backend
```bash
cd backend
source venv/Scripts/activate
uvicorn app.main:app --reload
```
*Backend runs on: `http://localhost:8000`*

### Start Frontend
```bash
cd frontend
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

## 📱 Adding Cameras
You can add **RTSP** or **HTTP (MJPEG)** streams.
-   **IP Webcam (Android)**: `http://192.168.1.X:8080/video`
-   **Standard RTSP**: `rtsp://user:pass@192.168.1.X:554/stream`

## 🛠️ Configuration
-   **Settings Page**: Manage storage, sensitive areas, and user accounts.
-   **Data Management**: Use "Delete All Events" to instantly purge database logs and media files to save disk space.

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📜 License
[MIT](https://choosealicense.com/licenses/mit/)

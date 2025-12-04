# Integrated CCTV and Firewall Based Smart Campus Security System

An advanced, intelligent security system for campus monitoring with real-time AI-powered face recognition, eye tracking, person tracking, and automated threat detection.

## 🌟 Key Features

### 📹 **Video & AI Recognition**
- **Real-time CCTV Streaming**: Live video feed from cameras with 1080p support
- **24/7 AI Face Recognition**: Automated face detection using Haar Cascade classifiers
- **Object Detection**: Real-time person detection using HOG (Histogram of Oriented Gradients)
- **Eye Tracking**: Advanced eye detection and pupil tracking
- **Person Tracking**: Multi-object tracking using centroid tracking algorithm
- **Frame Overlay**: Real-time visualization of all detections on live video

### 🚨 **Alert & Threat Management**
- **Real-time Alerts**: Automated alerts for detected threats
- **Alert Severity Levels**: CRITICAL, HIGH, MEDIUM, LOW
- **Alert Types**: Security threats, unauthorized access, network anomalies, hardware failures
- **Alert Center**: Centralized dashboard for managing and tracking alerts
- **Email Notifications**: Configurable email alerts for critical events

### 🔐 **Firewall Integration**
- **IP Blocking**: Automatic and manual IP blocking
- **IP Whitelist**: Protected IPs that cannot be blocked
- **Threat Detection**: AI-triggered firewall responses
- **Suspicious Activity Tracking**: Automatic blocking after threshold
- **Threat Logs**: Complete audit trail of all firewall actions

### 📊 **Analytics & Reporting**
- **Detection Statistics**: Real-time statistics on detections
- **Daily Reports**: Automated daily security reports
- **Weekly Reports**: Trend analysis and historical data
- **Detection History**: Complete history of all detections
- **Visual Dashboard**: Modern, interactive dashboard

### 👥 **User Management**
- **Role-Based Access**: Admin and user roles
- **Secure Authentication**: Flask-Login with password hashing
- **User Dashboard**: Personalized security overview

## 🏗️ **Architecture**

### Backend Components

#### `app/video.py` - Video Processing Engine
```python
VideoProcessor - Main video processing class
├── Face Detection (Haar Cascade)
├── Person Detection (HOG descriptor)
├── Eye Tracking (Haar Cascade)
└── PersonTracker - Multi-object centroid tracking
```

#### `app/firewall.py` - Firewall Manager
```python
FirewallManager - Network security management
├── IP Blocking/Unblocking
├── IP Whitelist Management
├── Suspicious Activity Tracking
├── AI Threat Response
└── Threat Logging & Reporting
```

#### `app/alerts.py` - Alert System
```python
AlertGenerator - Alert generation and delivery
├── Console/Logging alerts
├── Email notifications
├── Alert History
└── Alert Summary & Statistics
```

#### `app/models.py` - Database Models
```
User - User accounts and authentication
Detection - AI detection records (faces, persons, eyes)
Alert - Security alerts
Camera - Camera configuration
TrackingData - Person tracking data
```

### Frontend Components

#### Dashboard (`dashboard.html`)
- Live CCTV feed with AI overlays
- Real-time statistics (faces, persons, eyes, alerts)
- Recent alerts panel
- Live tracking information
- Camera status monitoring
- Detection history with filters

#### Live Detections (`live_detections.html`)
- Detailed detection monitoring
- Filter by detection type
- Real-time statistics
- Detection cards with metadata

#### Alerts Center (`alerts_center.html`)
- All alerts in one place
- Filter by status (Active, Acknowledged, Resolved)
- Severity indicators
- Quick action buttons
- Alert statistics

#### Firewall Control (`firewall_control.html`)
- IP blocking/unblocking interface
- Blocked/whitelisted IP lists
- Firewall status overview
- Threat logs
- Real-time threat monitoring

#### Camera Settings (`camera_settings.html`)
- Add new cameras
- Configure camera parameters
- Camera status monitoring
- AI settings per camera
- Camera statistics

## 🚀 **Installation & Setup**

### Prerequisites
- Python 3.6 or higher
- Pip
- Webcam/CCTV camera (optional, system works with demo)

### Installation Steps

```bash
# Clone the repository
git clone <repository-url>
cd "Integrated CCTV and Firewall Based Smart Campus security System"

# Install dependencies
pip install -r requirements.txt

# Initialize database
python init_db.py

# Create admin user (optional, for firewall access)
python -c "from app import create_app, db; from app.models import User; app = create_app(); app.app_context().push(); u = User(username='admin', email='admin@campus.edu', is_admin=True); u.set_password('admin123'); db.session.add(u); db.session.commit(); print('Admin user created')"

# Run the application
python main.py
```

### Access the Application
- **Home Page**: http://localhost:5000/
- **Login**: http://localhost:5000/login
- **Dashboard**: http://localhost:5000/dashboard (requires login)

### Default Credentials
- Username: `admin`
- Password: `admin123`

## 📊 **API Endpoints**

### Video & Detections
- `GET /video_feed` - Live video stream with overlays
- `GET /api/detections` - Current detections (faces, persons, eyes)
- `GET /api/detections/history` - Detection history with filters
- `GET /api/statistics` - Video processing statistics

### Alerts
- `GET /api/alerts` - Get all active alerts
- `POST /api/alerts` - Create new alert
- `POST /api/alerts/<id>/acknowledge` - Acknowledge alert
- `POST /api/alerts/<id>/resolve` - Resolve alert

### Firewall
- `GET /api/firewall/status` - Firewall status and blocked IPs
- `POST /api/firewall/block` - Block an IP address
- `POST /api/firewall/unblock` - Unblock an IP address

### Cameras
- `GET /api/cameras` - Get all cameras
- `POST /api/cameras` - Add new camera

### Reports
- `GET /api/reports/daily` - Daily security report
- `GET /api/reports/weekly` - Weekly security report

## 🔧 **Configuration**

### Video Processor Settings
```python
VideoProcessor(
    video_source=0,  # 0 for default camera
    enable_face_detection=True,
    enable_object_detection=True,
    enable_eye_tracking=True,
    enable_person_tracking=True
)
```

### Email Alert Configuration
```python
email_config = {
    'smtp_server': 'smtp.gmail.com',
    'smtp_port': 587,
    'sender_email': 'your-email@gmail.com',
    'sender_password': 'your-app-password'
}
```

### Firewall Threshold
```python
firewall_manager.threat_threshold = 3  # Block after 3 suspicious activities
```

## 📈 **Performance**

- **Video Processing**: 30 FPS @ 1280x720
- **Face Detection**: ~50-100ms per frame
- **Person Detection**: ~100-200ms per frame
- **Eye Tracking**: ~20-50ms per face
- **Detection Storage**: Configurable history limits

## 🔒 **Security Features**

1. **Authentication**: Secure password hashing with Werkzeug
2. **Session Management**: Flask-Login with remember-me functionality
3. **Admin-Only Features**: Firewall control and camera settings
4. **Threat Logging**: Complete audit trail of all security events
5. **IP Blocking**: Automatic and manual threat response
6. **Email Alerts**: Real-time notifications for critical events

## 🛠️ **Technologies Used**

- **Backend**: Flask, SQLAlchemy, Flask-Login
- **Computer Vision**: OpenCV, NumPy
- **Database**: SQLite (production-ready for PostgreSQL)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Face/Object Detection**: Haar Cascade, HOG Descriptor

## 📝 **Database Models**

### User
- Stores user accounts and authentication data
- Supports admin role for firewall access

### Detection
- Records all face, person, and eye detections
- Timestamp and confidence scores
- Metadata for each detection

### Alert
- Stores all security alerts
- Tracks alert status (Active, Acknowledged, Resolved)
- Links to user who created it

### Camera
- Configuration for each CCTV camera
- Stream URL and resolution settings
- Online status tracking

### TrackingData
- Person tracking history
- Track ID and centroid position
- Used for analytics and playback

## 🚀 **Future Enhancements**

- [ ] Deep learning models (YOLO, ResNet) for better accuracy
- [ ] Multistream processing (multiple cameras simultaneously)
- [ ] Video recording and playback
- [ ] License plate recognition
- [ ] Weapon detection
- [ ] Crowd density analysis
- [ ] Mobile app for alerts
- [ ] Cloud integration
- [ ] Redis caching for performance
- [ ] WebSocket for real-time updates

## 📞 **Support & Documentation**

For detailed documentation on each component, refer to the inline code comments.

## 📄 **License**

This project is part of the KMCT Smart Campus initiative.

## 👨‍💼 **Contributors**

- KMCT Smart Campus Security Team

## 🙏 **Acknowledgments**

- OpenCV community for computer vision libraries
- Flask community for excellent web framework
- All contributors and testers

---

**Last Updated**: December 2024
**Version**: 1.0.0

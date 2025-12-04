from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json

db = SQLAlchemy()


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    alerts = db.relationship('Alert', backref='created_by', lazy='dynamic')
    detections = db.relationship('Detection', backref='created_by', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat()
        }
    
    def get_recent_alerts(self, limit=10):
        """Get recent alerts created by this user"""
        return self.alerts.order_by(Alert.created_at.desc()).limit(limit).all()
    
    def get_recent_detections(self, limit=20):
        """Get recent detections recorded by this user"""
        return self.detections.order_by(Detection.created_at.desc()).limit(limit).all()


class Detection(db.Model):
    """Store AI detection results"""
    id = db.Column(db.Integer, primary_key=True)
    frame_id = db.Column(db.Integer)
    detection_type = db.Column(db.String(50))  # 'face', 'person', 'eye'
    x = db.Column(db.Integer)
    y = db.Column(db.Integer)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    confidence = db.Column(db.Float)
    extra = db.Column(db.JSON)  # Additional detection data (renamed from 'metadata' to avoid reserved name)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    camera_id = db.Column(db.String(50), db.ForeignKey('camera.camera_id'))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    def __repr__(self):
        return f'<Detection {self.detection_type} at {self.created_at}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'frame_id': self.frame_id,
            'type': self.detection_type,
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height,
            'confidence': self.confidence,
            'metadata': self.extra,
            'timestamp': self.created_at.isoformat(),
            'camera_id': self.camera_id
        }


class Alert(db.Model):
    """Store security alerts"""
    id = db.Column(db.Integer, primary_key=True)
    alert_type = db.Column(db.String(100))  # 'UNAUTHORIZED_ACCESS', 'THREAT_DETECTED', etc.
    severity = db.Column(db.String(20))  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    message = db.Column(db.Text)
    status = db.Column(db.String(20), default='ACTIVE')  # 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'
    source = db.Column(db.String(100))  # 'FIREWALL', 'CCTV', 'AI_DETECTION'
    location = db.Column(db.String(100))  # Location of the alert
    extra = db.Column(db.JSON)  # Additional alert data (renamed from 'metadata' to avoid reserved name)
    resolved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    def __repr__(self):
        return f'<Alert {self.severity} - {self.alert_type}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.alert_type,
            'severity': self.severity,
            'message': self.message,
            'status': self.status,
            'source': self.source,
            'location': self.location,
            'metadata': self.extra,
            'timestamp': self.created_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }
    
    def acknowledge(self):
        """Mark alert as acknowledged"""
        self.status = 'ACKNOWLEDGED'
        db.session.commit()
    
    def resolve(self):
        """Mark alert as resolved"""
        self.status = 'RESOLVED'
        self.resolved_at = datetime.utcnow()
        db.session.commit()
    
    def is_critical(self):
        """Check if alert is critical"""
        return self.severity == 'CRITICAL'
    
    def is_active(self):
        """Check if alert is still active"""
        return self.status == 'ACTIVE'
    
    @property
    def duration(self):
        """Get duration since alert was created"""
        end = self.resolved_at or datetime.utcnow()
        return end - self.created_at


class Camera(db.Model):
    """Store CCTV camera information"""
    id = db.Column(db.Integer, primary_key=True)
    camera_id = db.Column(db.String(50), unique=True, index=True)
    name = db.Column(db.String(100))
    location = db.Column(db.String(200))
    stream_url = db.Column(db.String(500))
    status = db.Column(db.String(20), default='ACTIVE')  # 'ACTIVE', 'OFFLINE', 'MAINTENANCE'
    resolution = db.Column(db.String(20))  # '1080p', '720p', etc.
    fps = db.Column(db.Integer)  # Frames per second
    is_ai_enabled = db.Column(db.Boolean, default=True)
    last_heartbeat = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    detections = db.relationship('Detection', backref='camera', lazy='dynamic')
    
    def __repr__(self):
        return f'<Camera {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'camera_id': self.camera_id,
            'name': self.name,
            'location': self.location,
            'stream_url': self.stream_url,
            'status': self.status,
            'resolution': self.resolution,
            'fps': self.fps,
            'is_ai_enabled': self.is_ai_enabled,
            'last_heartbeat': self.last_heartbeat.isoformat() if self.last_heartbeat else None
        }
    
    def is_online(self):
        """Check if camera is online (heartbeat within 30 seconds)"""
        from datetime import timedelta
        if not self.last_heartbeat:
            return False
        return (datetime.utcnow() - self.last_heartbeat) < timedelta(seconds=30)
    
    def update_heartbeat(self):
        """Update camera heartbeat"""
        self.last_heartbeat = datetime.utcnow()
        if not self.is_online():
            self.status = 'OFFLINE'
        else:
            self.status = 'ACTIVE'
        db.session.commit()
    
    def get_recent_detections(self, limit=50):
        """Get recent detections from this camera"""
        return self.detections.order_by(Detection.created_at.desc()).limit(limit).all()
    
    def get_detection_count(self):
        """Get total detection count from this camera"""
        return self.detections.count()
    
    @property
    def uptime_percentage(self):
        """Calculate camera uptime percentage"""
        if not self.created_at:
            return 0
        total_time = datetime.utcnow() - self.created_at
        if total_time.total_seconds() == 0:
            return 100
        # Simple calculation based on last heartbeat
        if self.is_online():
            return 100
        return 0


class TrackingData(db.Model):
    """Store person tracking data"""
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer, index=True)
    camera_id = db.Column(db.String(50), index=True)
    x = db.Column(db.Integer)
    y = db.Column(db.Integer)
    confidence = db.Column(db.Float)
    frame_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f'<TrackingData Track #{self.track_id} at {self.created_at}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'track_id': self.track_id,
            'camera_id': self.camera_id,
            'x': self.x,
            'y': self.y,
            'confidence': self.confidence,
            'frame_id': self.frame_id,
            'timestamp': self.created_at.isoformat()
        }


# Additional helper methods for database operations
class DetectionQuery:
    """Helper class for common detection queries"""
    
    @staticmethod
    def get_recent_detections(limit=50, detection_type=None):
        """Get recent detections"""
        query = Detection.query.order_by(Detection.created_at.desc()).limit(limit)
        if detection_type:
            query = query.filter_by(detection_type=detection_type)
        return query.all()
    
    @staticmethod
    def get_detections_by_camera(camera_id, limit=100):
        """Get detections for a specific camera"""
        return Detection.query.filter_by(camera_id=camera_id).order_by(
            Detection.created_at.desc()
        ).limit(limit).all()
    
    @staticmethod
    def get_detections_by_type(detection_type, limit=50):
        """Get detections by type (face, person, eye)"""
        return Detection.query.filter_by(detection_type=detection_type).order_by(
            Detection.created_at.desc()
        ).limit(limit).all()
    
    @staticmethod
    def count_detections_today():
        """Count detections from today"""
        from datetime import date
        today = date.today()
        return Detection.query.filter(
            db.func.date(Detection.created_at) == today
        ).count()
    
    @staticmethod
    def count_by_type(detection_type=None):
        """Count detections by type"""
        if detection_type:
            return Detection.query.filter_by(detection_type=detection_type).count()
        return Detection.query.count()


class AlertQuery:
    """Helper class for common alert queries"""
    
    @staticmethod
    def get_active_alerts(limit=50):
        """Get all active alerts"""
        return Alert.query.filter_by(status='ACTIVE').order_by(
            Alert.created_at.desc()
        ).limit(limit).all()
    
    @staticmethod
    def get_alerts_by_severity(severity, limit=50):
        """Get alerts by severity level"""
        return Alert.query.filter_by(severity=severity).order_by(
            Alert.created_at.desc()
        ).limit(limit).all()
    
    @staticmethod
    def get_critical_alerts():
        """Get all critical alerts"""
        return Alert.query.filter_by(severity='CRITICAL', status='ACTIVE').all()
    
    @staticmethod
    def count_active_alerts():
        """Count active alerts"""
        return Alert.query.filter_by(status='ACTIVE').count()
    
    @staticmethod
    def count_by_severity():
        """Count alerts by severity"""
        return {
            'CRITICAL': Alert.query.filter_by(severity='CRITICAL').count(),
            'HIGH': Alert.query.filter_by(severity='HIGH').count(),
            'MEDIUM': Alert.query.filter_by(severity='MEDIUM').count(),
            'LOW': Alert.query.filter_by(severity='LOW').count()
        }


class CameraQuery:
    """Helper class for common camera queries"""
    
    @staticmethod
    def get_active_cameras():
        """Get all active cameras"""
        return Camera.query.filter_by(status='ACTIVE').all()
    
    @staticmethod
    def get_camera_by_id(camera_id):
        """Get camera by ID"""
        return Camera.query.filter_by(camera_id=camera_id).first()
    
    @staticmethod
    def count_cameras():
        """Count total cameras"""
        return Camera.query.count()
    
    @staticmethod
    def count_active_cameras():
        """Count active cameras"""
        return Camera.query.filter_by(status='ACTIVE').count()


class TrackingQuery:
    """Helper class for common tracking queries"""
    
    @staticmethod
    def get_track_history(track_id, limit=50):
        """Get tracking history for a specific track"""
        return TrackingData.query.filter_by(track_id=track_id).order_by(
            TrackingData.created_at.desc()
        ).limit(limit).all()
    
    @staticmethod
    def get_active_tracks(camera_id=None):
        """Get active tracks"""
        from datetime import timedelta
        recent_time = datetime.utcnow() - timedelta(seconds=10)
        query = TrackingData.query.filter(TrackingData.created_at >= recent_time)
        if camera_id:
            query = query.filter_by(camera_id=camera_id)
        return query.all()
    
    @staticmethod
    def count_unique_tracks(camera_id=None):
        """Count unique tracks in recent time"""
        from datetime import timedelta
        recent_time = datetime.utcnow() - timedelta(seconds=30)
        query = TrackingData.query.filter(TrackingData.created_at >= recent_time)
        if camera_id:
            query = query.filter_by(camera_id=camera_id)
        return len(set(track.track_id for track in query.all()))

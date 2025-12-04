from flask import Flask, Response, render_template, flash, redirect, url_for, request, jsonify
from config import Config
from app.video import VideoProcessor
from app.firewall import FirewallManager
from app.alerts import AlertGenerator
from flask_migrate import Migrate
from flask_login import LoginManager, UserMixin, current_user, login_user, logout_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from app.forms import LoginForm
from app.models import db, User, Detection, Alert, Camera, TrackingData
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = 'login'

# Global instances
video_processor = None
firewall_manager = None
alert_generator = None


def create_app():
    global video_processor, firewall_manager, alert_generator
    
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    # Initialize components
    video_processor = VideoProcessor(enable_face_detection=True,
                                    enable_object_detection=True,
                                    enable_eye_tracking=True,
                                    enable_person_tracking=True)
    
    firewall_manager = FirewallManager()
    alert_generator = AlertGenerator()

    @app.route('/')
    def index():
        """Home page"""
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
        return render_template('index.html')

    def gen(video):
        """Generate video stream"""
        while True:
            frame = video.get_frame()
            if frame is None:
                break
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

    @app.route('/video_feed')
    def video_feed():
        """Stream video feed with AI overlays"""
        return Response(gen(video_processor),
                        mimetype='multipart/x-mixed-replace; boundary=frame')

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        """Login page"""
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
        form = LoginForm()
        if form.validate_on_submit():
            user = User.query.filter_by(username=form.username.data).first()
            if user is None or not user.check_password(form.password.data):
                flash('Invalid username or password')
                return redirect(url_for('login'))
            login_user(user, remember=form.remember_me.data)
            return redirect(url_for('dashboard'))
        return render_template('login.html', form=form)

    @app.route('/logout')
    def logout():
        """Logout user"""
        logout_user()
        return redirect(url_for('index'))

    @app.route('/dashboard')
    @login_required
    def dashboard():
        """Main security dashboard"""
        # Get statistics
        stats = {
            'video_stats': video_processor.get_statistics(),
            'firewall_status': firewall_manager.get_firewall_status(),
            'recent_alerts': Alert.query.filter_by(status='ACTIVE').order_by(Alert.created_at.desc()).limit(10).all(),
            'recent_detections': Detection.query.order_by(Detection.created_at.desc()).limit(20).all(),
            'cameras': Camera.query.all()
        }
        return render_template('dashboard.html', stats=stats, current_user=current_user)

    @app.route('/api/detections')
    @login_required
    def api_detections():
        """Get current detections"""
        detections = video_processor.get_detections()
        return jsonify(detections)

    @app.route('/api/detections/history')
    @login_required
    def api_detections_history():
        """Get detection history"""
        detection_type = request.args.get('type', 'all')
        limit = request.args.get('limit', 100, type=int)
        history = video_processor.get_detection_history(detection_type, limit)
        return jsonify(history)

    @app.route('/api/statistics')
    @login_required
    def api_statistics():
        """Get video processing statistics"""
        stats = video_processor.get_statistics()
        return jsonify(stats)

    @app.route('/api/alerts', methods=['GET', 'POST'])
    @login_required
    def api_alerts():
        """Get or create alerts"""
        if request.method == 'POST':
            data = request.json
            alert = Alert(
                alert_type=data.get('type', 'GENERAL'),
                severity=data.get('severity', 'MEDIUM'),
                message=data.get('message'),
                source=data.get('source', 'MANUAL'),
                location=data.get('location'),
                extra=data.get('metadata'),
                user_id=current_user.id
            )
            db.session.add(alert)
            db.session.commit()
            return jsonify({'id': alert.id, 'status': 'created'}), 201
        
        # GET - retrieve alerts
        status = request.args.get('status', 'ACTIVE')
        limit = request.args.get('limit', 50, type=int)
        alerts = Alert.query.filter_by(status=status).order_by(Alert.created_at.desc()).limit(limit).all()
        return jsonify([alert.to_dict() for alert in alerts])

    @app.route('/api/alerts/<int:alert_id>/acknowledge', methods=['POST'])
    @login_required
    def acknowledge_alert(alert_id):
        """Acknowledge an alert"""
        alert = Alert.query.get(alert_id)
        if alert:
            alert.status = 'ACKNOWLEDGED'
            db.session.commit()
            return jsonify({'status': 'acknowledged'})
        return jsonify({'error': 'Alert not found'}), 404

    @app.route('/api/alerts/<int:alert_id>/resolve', methods=['POST'])
    @login_required
    def resolve_alert(alert_id):
        """Resolve an alert"""
        alert = Alert.query.get(alert_id)
        if alert:
            alert.status = 'RESOLVED'
            alert.resolved_at = datetime.utcnow()
            db.session.commit()
            return jsonify({'status': 'resolved'})
        return jsonify({'error': 'Alert not found'}), 404

    @app.route('/api/firewall/status')
    @login_required
    def firewall_status():
        """Get firewall status"""
        return jsonify(firewall_manager.get_firewall_status())

    @app.route('/api/firewall/block', methods=['POST'])
    @login_required
    def firewall_block():
        """Block an IP address"""
        if not current_user.is_admin:
            return jsonify({'error': 'Admin only'}), 403
        
        data = request.json
        ip = data.get('ip')
        reason = data.get('reason', 'Manual block')
        
        success = firewall_manager.block_ip(ip, reason)
        return jsonify({'blocked': success})

    @app.route('/api/firewall/unblock', methods=['POST'])
    @login_required
    def firewall_unblock():
        """Unblock an IP address"""
        if not current_user.is_admin:
            return jsonify({'error': 'Admin only'}), 403
        
        data = request.json
        ip = data.get('ip')
        
        success = firewall_manager.unblock_ip(ip)
        return jsonify({'unblocked': success})

    @app.route('/api/cameras')
    @login_required
    def api_cameras():
        """Get all cameras"""
        cameras = Camera.query.all()
        return jsonify([camera.to_dict() for camera in cameras])

    @app.route('/api/cameras', methods=['POST'])
    @login_required
    def add_camera():
        """Add a new camera"""
        if not current_user.is_admin:
            return jsonify({'error': 'Admin only'}), 403
        
        data = request.json
        camera = Camera(
            camera_id=data.get('camera_id'),
            name=data.get('name'),
            location=data.get('location'),
            stream_url=data.get('stream_url'),
            resolution=data.get('resolution', '720p'),
            fps=data.get('fps', 30)
        )
        db.session.add(camera)
        db.session.commit()
        return jsonify(camera.to_dict()), 201

    @app.route('/api/detections/store', methods=['POST'])
    @login_required
    def store_detections():
        """Store current detections to database"""
        detections = video_processor.get_detections()

        for face in detections.get('faces', []):
            detection = Detection(
                frame_id=detections['frame_id'],
                detection_type='face',
                x=face['x'],
                y=face['y'],
                width=face['width'],
                height=face['height'],
                confidence=face.get('confidence', 0),
                extra={'timestamp': face.get('timestamp')},
                camera_id='main',
                user_id=current_user.id
            )
            db.session.add(detection)

        for person in detections.get('persons', []):
            detection = Detection(
                frame_id=detections['frame_id'],
                detection_type='person',
                x=person['x'],
                y=person['y'],
                width=person['width'],
                height=person['height'],
                confidence=person.get('confidence', 0),
                extra={'timestamp': person.get('timestamp')},
                camera_id='main',
                user_id=current_user.id
            )
            db.session.add(detection)

        db.session.commit()
        return jsonify({'stored': len(detections.get('faces', [])) + len(detections.get('persons', []))})

    @app.route('/api/reports/daily')
    @login_required
    def daily_report():
        """Get daily security report"""
        today = datetime.utcnow().date()
        detections_count = Detection.query.filter(
            db.func.date(Detection.created_at) == today
        ).count()
        alerts_count = Alert.query.filter(
            db.func.date(Alert.created_at) == today
        ).count()
        
        return jsonify({
            'date': today.isoformat(),
            'total_detections': detections_count,
            'total_alerts': alerts_count,
            'breakdown': {
                'faces': Detection.query.filter(
                    Detection.detection_type == 'face',
                    db.func.date(Detection.created_at) == today
                ).count(),
                'persons': Detection.query.filter(
                    Detection.detection_type == 'person',
                    db.func.date(Detection.created_at) == today
                ).count(),
                'eyes': Detection.query.filter(
                    Detection.detection_type == 'eye',
                    db.func.date(Detection.created_at) == today
                ).count()
            }
        })

    @app.route('/api/reports/weekly')
    @login_required
    def weekly_report():
        """Get weekly security report"""
        week_ago = datetime.utcnow() - timedelta(days=7)
        detections = Detection.query.filter(Detection.created_at >= week_ago).all()
        alerts = Alert.query.filter(Alert.created_at >= week_ago).all()
        
        return jsonify({
            'period': 'last 7 days',
            'total_detections': len(detections),
            'total_alerts': len(alerts),
            'alerts_by_severity': {
                'CRITICAL': len([a for a in alerts if a.severity == 'CRITICAL']),
                'HIGH': len([a for a in alerts if a.severity == 'HIGH']),
                'MEDIUM': len([a for a in alerts if a.severity == 'MEDIUM']),
                'LOW': len([a for a in alerts if a.severity == 'LOW'])
            }
        })

    @app.route('/live-detections')
    @login_required
    def live_detections():
        """Live detections page"""
        return render_template('live_detections.html')

    @app.route('/alerts-center')
    @login_required
    def alerts_center():
        """Alert management center"""
        return render_template('alerts_center.html')

    @app.route('/firewall-control')
    @login_required
    def firewall_control():
        """Firewall control panel"""
        if not current_user.is_admin:
            flash('Admin access required')
            return redirect(url_for('dashboard'))
        return render_template('firewall_control.html')

    @app.route('/camera-settings')
    @login_required
    def camera_settings():
        """Camera configuration"""
        if not current_user.is_admin:
            flash('Admin access required')
            return redirect(url_for('dashboard'))
        return render_template('camera_settings.html')

    return app


from app.models import User

@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))

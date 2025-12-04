#!/usr/bin/env python3
"""
Quick Start Guide for Smart Campus Security System
Run this to initialize and test the system
"""

import os
import sys
from pathlib import Path

def print_banner():
    """Print welcome banner"""
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║     🛡️  SMART CAMPUS SECURITY SYSTEM 🛡️                  ║
    ║                                                            ║
    ║   Integrated CCTV & Firewall Based Security System         ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
    """)

def check_requirements():
    """Check if all required packages are installed"""
    print("📋 Checking requirements...")
    
    required_packages = [
        'Flask',
        'opencv',
        'sqlalchemy',
        'numpy',
        'werkzeug'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ✗ {package} - MISSING")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("📥 Installing missing packages...")
        print("   Run: pip install -r requirements.txt")
        return False
    
    print("\n✅ All requirements satisfied!\n")
    return True

def create_sample_data():
    """Create sample database and user"""
    print("🗄️  Setting up database...")
    
    try:
        from app import create_app, db
        from app.models import User, Camera
        
        app = create_app()
        
        with app.app_context():
            # Create all tables
            db.create_all()
            print("  ✓ Database tables created")
            
            # Check if admin user exists
            admin = User.query.filter_by(username='admin').first()
            if not admin:
                admin = User(
                    username='admin',
                    email='admin@campus.edu',
                    is_admin=True
                )
                admin.set_password('admin123')
                db.session.add(admin)
                db.session.commit()
                print("  ✓ Admin user created (admin / admin123)")
            else:
                print("  ✓ Admin user already exists")
            
            # Create sample camera if none exists
            if Camera.query.count() == 0:
                camera = Camera(
                    camera_id='CAM-001',
                    name='Main Entrance',
                    location='Building A - Main Gate',
                    stream_url='rtsp://192.168.1.100:554/stream',
                    resolution='1080p',
                    fps=30,
                    is_ai_enabled=True
                )
                db.session.add(camera)
                db.session.commit()
                print("  ✓ Sample camera created")
            
            print("\n✅ Database setup complete!\n")
            return True
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        return False

def print_startup_info():
    """Print startup information"""
    print("=" * 60)
    print("🚀 READY TO START!")
    print("=" * 60)
    print("\n📝 Configuration:")
    print("  • Flask Debug Mode: ON (change in production)")
    print("  • Database: SQLite (app.db)")
    print("  • Video Source: Default Webcam")
    print("  • Port: 5000")
    print("  • Host: localhost (127.0.0.1)")
    
    print("\n🔑 Login Credentials:")
    print("  • Username: admin")
    print("  • Password: admin123")
    print("  • Role: Administrator")
    
    print("\n🌐 Access Points:")
    print("  • Home: http://localhost:5000/")
    print("  • Login: http://localhost:5000/login")
    print("  • Dashboard: http://localhost:5000/dashboard")
    
    print("\n📊 Available Features:")
    print("  ✓ Live CCTV video feed")
    print("  ✓ Real-time face detection")
    print("  ✓ Person detection & tracking")
    print("  ✓ Eye tracking")
    print("  ✓ Alert management")
    print("  ✓ Firewall control")
    print("  ✓ Camera configuration")
    print("  ✓ Daily & weekly reports")
    
    print("\n⚙️  Next Steps:")
    print("  1. Run: python main.py")
    print("  2. Open browser: http://localhost:5000")
    print("  3. Login with admin credentials")
    print("  4. Configure cameras in Settings")
    print("  5. Monitor live feed on Dashboard")
    
    print("\n📚 Documentation:")
    print("  • See: PROJECT_DOCUMENTATION.md")
    print("  • See: IMPLEMENTATION_SUMMARY.md")
    
    print("\n" + "=" * 60)

def main():
    """Main setup function"""
    print_banner()
    
    # Check requirements
    if not check_requirements():
        print("⚠️  Please install missing packages and try again.")
        sys.exit(1)
    
    # Setup database
    if not create_sample_data():
        print("⚠️  Database setup failed. Check your installation.")
        sys.exit(1)
    
    # Print startup info
    print_startup_info()
    
    print("\n💡 Tips:")
    print("  • Use Ctrl+C to stop the server")
    print("  • Check console for detection logs")
    print("  • Use alerts panel to monitor threats")
    print("  • Admin panel for firewall management")
    
    print("\n🎯 Ready to launch! Run: python main.py\n")

if __name__ == '__main__':
    main()

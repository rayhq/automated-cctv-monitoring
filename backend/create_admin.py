# create_admin.py
from app.database import SessionLocal
from app.models import User

# ⚠️ Import your password-hash function from wherever you defined it.
# Common places:
# from app.auth import get_password_hash
# or from app.dependencies import get_password_hash
from app.auth import get_password_hash  # <--- adjust if needed


def main():
    db = SessionLocal()

    username = "admin"
    password = "admin123"

    # Check if user already exists
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        print("User 'admin' already exists.")
        return

    hashed_pw = get_password_hash(password)

    user = User(
        username=username,
        full_name="Administrator",
        hashed_password=hashed_pw,
        is_active=True,
        is_admin=True,
    )
    db.add(user)
    db.commit()
    print("✅ Admin user created: admin / admin123")


if __name__ == "__main__":
    main()

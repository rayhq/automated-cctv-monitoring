# backend/add_user.py

import getpass

from app.core.database import SessionLocal
from app.models.all_models import User
from app.core.security import get_password_hash


def add_user():
    db = SessionLocal()

    # 1. List current users
    users = db.query(User).all()
    print("\n👤 --- CURRENT USERS IN DB ---")
    print(f"{'ID (PK)':<6} | {'Username':<15} | {'Full name':<20} | {'Admin'}")
    print("-" * 60)

    for u in users:
        print(
            f"{u.id:<6} | {u.username:<15} | {str(getattr(u, 'full_name', '') or ''):<20} | {getattr(u, 'is_admin', False)}"
        )
    print("-" * 60)

    # 2. Ask for new user info
    username = input("\nEnter new username: ").strip()
    if not username:
        print("❌ Username cannot be empty.")
        db.close()
        return

    existing = db.query(User).filter(User.username == username).first()
    if existing:
        print("⚠️ User with that username already exists.")
        db.close()
        return

    full_name = input("Enter full name (optional): ").strip()

    is_admin_input = input("Is admin? [y/N]: ").strip().lower()
    is_admin = is_admin_input in ("y", "yes")

    password = getpass.getpass("Enter password: ").strip()
    if not password:
        print("❌ Password cannot be empty.")
        db.close()
        return

    password_confirm = getpass.getpass("Re enter password: ").strip()
    if password != password_confirm:
        print("❌ Passwords do not match.")
        db.close()
        return

    # 3. Hash and create user
    try:
        hashed = get_password_hash(password)
    except Exception as e:
        print(f"❌ Error hashing password: {e}")
        db.close()
        return

    new_user = User(
        username=username,
        full_name=full_name or None,
        hashed_password=hashed,
        is_admin=is_admin,
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(
            f"\n✅ User created successfully:"
            f"\n   ID       : {new_user.id}"
            f"\n   Username : {new_user.username}"
            f"\n   Full name: {new_user.full_name}"
            f"\n   Is admin : {new_user.is_admin}"
        )
    except Exception as e:
        db.rollback()
        print(f"❌ Error while creating user: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    add_user()

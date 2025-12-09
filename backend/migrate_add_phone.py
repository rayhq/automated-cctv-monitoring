# migrate_add_phone.py
import sqlite3

DB_PATH = "cctv.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE users ADD COLUMN phone_number TEXT")
    print("Added phone_number column.")
except Exception as e:
    print("Skipped adding phone_number:", e)

conn.commit()
conn.close()

# app/routes/settings.py
import json
import os
from fastapi import APIRouter, HTTPException, Depends
from app.schemas import all_schemas as schemas

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_FILE = "config/system_settings.json"

DEFAULT_SETTINGS = {
    "retentionDays": 14,
    "streamQuality": "High",
    "theme": "Dark",
    "autoUpdate": True,
    "emailAlerts": False,
    "pushNotifications": True,
    "sensitivity": 85,
    "cooldown": 5,
    "discordEnabled": False,
    "discordWebhookUrl": ""
}

def load_settings():
    if not os.path.exists(SETTINGS_FILE):
        os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
        with open(SETTINGS_FILE, "w") as f:
            json.dump(DEFAULT_SETTINGS, f, indent=4)
        return DEFAULT_SETTINGS
    
    try:
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return DEFAULT_SETTINGS

def save_settings_to_disk(settings_dict):
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings_dict, f, indent=4)

@router.get("", response_model=schemas.SystemSettings)
def get_settings():
    return load_settings()

@router.put("", response_model=schemas.SystemSettings)
def update_settings(payload: schemas.SystemSettings):
    data = payload.dict()
    save_settings_to_disk(data)
    return data

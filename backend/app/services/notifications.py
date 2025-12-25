import requests
import json
import os

def send_discord_notification(event_data, settings):
    """
    Sends a rich Discord embed notification via Webhook.
    """
    if not settings.get("discordEnabled") or not settings.get("discordWebhookUrl"):
        print("⚠️ Discord notifications disabled or URL missing.")
        return

    webhook_url = settings.get("discordWebhookUrl")
    
    # Determine color (Red for threat, Orange/Yellow for caution)
    color = 15158332  # Red
    if event_data.event_type == "intrusion":
        color = 15105570 # Orange
    
    # Construct Embed
    embed = {
        "title": f"🚨 Security Alert: {event_data.event_type.replace('_', ' ').title()}",
        "description": event_data.description,
        "color": color,
        "fields": [
            {
                "name": "Camera",
                "value": event_data.camera_id,
                "inline": True
            },
            {
                "name": "Confidence",
                "value": f"{event_data.confidence:.2f}",
                "inline": True
            },
            {
                "name": "Time",
                "value": f"<t:{int(event_data.timestamp.timestamp())}:R>",
                "inline": True
            }
        ],
        "footer": {
            "text": "Automated CCTV System"
        }
    }

    # Prepare payload with JSON
    # For now, we are sending just JSON. 
    # To include image, we would need multipart/form-data which is more complex with embeds
    # Simple strategy: Send embed, then if image exists, send it as a second message
    
    try:
        # 1. Send Embed
        payload = {"embeds": [embed]}
        headers = {"Content-Type": "application/json"}
        
        resp = requests.post(webhook_url, json=payload, headers=headers, timeout=5)
        
        if resp.status_code == 204:
            print("✅ Discord notification sent.")
        else:
            print(f"⚠️ Discord webhook failed: {resp.status_code} - {resp.text}")

        # 2. Upload Image (Optional separate request if local path exists)
        # Note: 'image_path' is relative like "media/cam1_...jpg"
        # We need absolute path.
        # Assuming MEDIA_DIR is standard.
        if event_data.image_path:
            abs_image_path = os.path.abspath(os.path.join("..", event_data.image_path))
            # Just a best effort check, path might be tricky depending on CWD
            # Let's try to construct it based on where we know media is
            # event_data.image_path is "media/filename.jpg"
            # We are in app/services, so ../../media/filename.jpg
            
            # Actually easier: just rely on the relative path if running from root
            if os.path.exists(event_data.image_path):
                with open(event_data.image_path, "rb") as f:
                    files = {'file': (os.path.basename(event_data.image_path), f)}
                    requests.post(webhook_url, files=files, timeout=10)
                    print("📸 Discord image uploaded.")

    except Exception as e:
        print(f"⚠️ Failed to send Discord alert: {e}")

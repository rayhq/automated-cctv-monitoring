# app/sms.py
import os

def send_otp_sms(phone_number: str | None, code: str) -> None:
    """
    Send OTP via SMS to the given phone number.

    Right now this is DEV mode – it just prints.
    You can plug in Twilio / Fast2SMS / other provider here.
    """
    if not phone_number:
        print(f"[SMS] No phone number set for user. OTP = {code}")
        return

    # --- DEV MODE ---
    print(f"[SMS DEV] Would send OTP {code} to {phone_number}")
    # ---------------

    # Example for real provider (pseudo-code):
    # import requests
    # api_key = os.getenv("FAST2SMS_API_KEY")
    # if not api_key:
    #     print("[SMS] FAST2SMS_API_KEY not set; falling back to dev print.")
    #     return
    #
    # url = "https://www.fast2sms.com/dev/bulkV2"
    # payload = {
    #     "sender_id": "CCTVDB",
    #     "route": "v3",
    #     "numbers": phone_number,
    #     "message": f"Your CCTV dashboard OTP is {code}. It expires in 10 minutes."
    # }
    # headers = {
    #     "authorization": api_key
    # }
    # r = requests.post(url, data=payload, headers=headers)
    # print("[SMS] Fast2SMS response:", r.status_code, r.text)

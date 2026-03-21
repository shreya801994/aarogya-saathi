import os
from dotenv import load_dotenv
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

load_dotenv()

_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
_auth_token  = os.getenv("TWILIO_AUTH_TOKEN")
_service_sid = os.getenv("TWILIO_VERIFY_SERVICE_SID")

client = Client(_account_sid, _auth_token)


def send_otp(phone: str) -> dict:
    """
    Sends OTP via Twilio Verify.
    Phone must include country code e.g. +919876543210
    """
    try:
        verification = client.verify.v2.services(_service_sid) \
            .verifications.create(to=phone, channel="sms")
        print(f"[VERIFY] OTP sent to {phone} — status: {verification.status}")
        return {"status": "sent"}

    except TwilioRestException as e:
        if e.code == 60200:
            reason = "Invalid phone number format. Use +91xxxxxxxxxx"
        elif e.code == 60203:
            reason = "Max attempts reached — wait 10 minutes"
        elif e.code == 21608:
            reason = "Number not verified in Twilio trial account"
        else:
            reason = f"Twilio error {e.code}: {e.msg}"
        print(f"[VERIFY ERROR] {reason}")
        return {"status": "failed", "reason": reason}

    except Exception as e:
        print(f"[VERIFY ERROR] Unexpected: {e}")
        return {"status": "failed", "reason": "SMS service unavailable"}


def verify_otp(phone: str, code: str) -> bool:
    """
    Checks OTP entered by patient.
    Returns True if correct and not expired.
    """
    try:
        result = client.verify.v2.services(_service_sid) \
            .verification_checks.create(to=phone, code=code)
        return result.status == "approved"

    except TwilioRestException as e:
        print(f"[VERIFY CHECK ERROR] {e.code}: {e.msg}")
        return False

    except Exception as e:
        print(f"[VERIFY CHECK ERROR] Unexpected: {e}")
        return False
import os
import json
import io
import asyncio
from functools import partial
from PIL import Image
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.api_core.exceptions import (
    ResourceExhausted, ServiceUnavailable,
    InvalidArgument, PermissionDenied
)

load_dotenv(override=True)

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in .env file.")

client = genai.Client(api_key=api_key)

CRITICAL_OVERRIDE_RULE = """
TRIAGE OVERRIDE PROTOCOL (NON-NEGOTIABLE):
Step 1 — Scan ALL symptom sources (text, audio transcript, FHIR history) for:
  RED FLAGS: chest pain, chest tightness, shortness of breath, can't breathe,
             stroke, facial drooping, sudden weakness, seizure, unconscious,
             severe bleeding, trauma, head injury, anaphylaxis, throat swelling.

Step 2 — If ANY red flag detected:
  → risk_score MUST be 80–100 regardless of lab results.
  → Add "OVERRIDE: Symptom-based emergency escalation" to abnormalities.
  → Normal labs do NOT reduce score below 80.

Step 3 — If NO red flags:
  → Score normally using full clinical picture.
"""

def _validate_ai_response(raw: dict) -> dict:
    """Ensures correct types and keys. Never crashes downstream."""
    summary = str(raw.get("summary") or "No summary provided.")

    abnormalities = raw.get("abnormalities", [])
    if not isinstance(abnormalities, list):
        abnormalities = [str(abnormalities)] if abnormalities else []

    try:
        risk_score = int(float(str(raw.get("risk_score", 99))))
        risk_score = max(1, min(100, risk_score))
    except (ValueError, TypeError):
        risk_score = 99

    return {
        "summary": summary,
        "abnormalities": abnormalities,
        "risk_score": risk_score
    }

def _fallback_response(reason: str) -> dict:
    return {
        "summary": f"SYSTEM ERROR ({reason}): Manual triage required.",
        "abnormalities": [f"AI unavailable: {reason}"],
        "risk_score": 99,
        "fallback": True,
        "fallback_reason": reason
    }

async def analyze_and_triage(
    image_bytes=None,
    patient_symptoms="No symptoms reported.",
    audio_bytes=None,
    fhir_data=None
):
    """Analyzes multimodal patient data and returns validated triage JSON."""

    # 1. Handle image safely
    image_part = None
    if image_bytes and len(image_bytes) > 0:
        try:
            image_part = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            print(f"Warning: Could not process image: {e}")

    # 2. Build prompt
    prompt = f"""
You are an ER Triage AI. Analyze symptoms, medical reports, and past history.

PATIENT SYMPTOMS (TEXT): "{patient_symptoms}"

AUDIO INSTRUCTION: If audio is attached, listen carefully.
Translate any Hindi to English and include in your assessment.

{CRITICAL_OVERRIDE_RULE}
"""

    if fhir_data:
        prompt += f"""
--- VERIFIED PAST MEDICAL RECORDS (ABHA FHIR) ---
{json.dumps(fhir_data, indent=2)}

FHIR INSTRUCTION: Check for chronic conditions and allergies.
Cross-reference with current symptoms. Increase risk score for
related active conditions. Always flag critical allergies.
"""

    prompt += """
Respond with strict JSON containing exactly:
{
  "summary": "Clinical summary combining all inputs",
  "abnormalities": ["finding 1", "finding 2"],
  "risk_score": <integer 1-100>
}
"""

    # 3. Assemble payload
    contents_to_send = [prompt]
    if image_part:
        contents_to_send.append(image_part)
    if audio_bytes and len(audio_bytes) > 0:
        contents_to_send.append(
            types.Part.from_bytes(data=audio_bytes, mime_type="audio/webm")
        )

    # 4. Call Gemini with retry logic + async wrapping
    loop = asyncio.get_event_loop()

    for attempt in range(3):
        try:
            blocking_call = partial(
                client.models.generate_content,
                model='gemini-2.5-flash',
                contents=contents_to_send,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    response_mime_type="application/json"
                )
            )
            response = await loop.run_in_executor(None, blocking_call)
            parsed = json.loads(response.text)
            return _validate_ai_response(parsed)

        except ResourceExhausted:
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
                continue
            return _fallback_response("RATE_LIMITED")

        except ServiceUnavailable:
            if attempt < 2:
                await asyncio.sleep(1.5)
                continue
            return _fallback_response("GEMINI_DOWN")

        except InvalidArgument as e:
            print(f"Bad payload: {e}")
            return _fallback_response("BAD_INPUT")

        except PermissionDenied:
            raise RuntimeError("CRITICAL: Gemini API key invalid or revoked.")

        except Exception as e:
            print(f"Unexpected error: {e}")
            return _fallback_response("UNKNOWN_ERROR")
import redis.asyncio as aioredis
import json
import os
from dotenv import load_dotenv

load_dotenv()

redis_client = aioredis.from_url(
    os.getenv("REDIS_URL"),
    decode_responses=True
)


async def add_patient_to_queue(token, ai_data, raw_fhir_json=None):
    """Adds patient to priority queue and caches FHIR data with 2-hour TTL."""

    priority_score = -int(ai_data.get("risk_score", 0))

    # Sorted set: token only as member — prevents overwrites
    await redis_client.zadd("triage_queue", {token: priority_score})

    # AI summary stored separately in a hash
    await redis_client.hset(f"patient:{token}", mapping={
        "summary":       ai_data.get("summary", ""),
        "risk_score":    str(ai_data.get("risk_score", 0)),
        "abnormalities": json.dumps(ai_data.get("abnormalities", []))
    })

    # FHIR data: atomic set + TTL in one call
    if raw_fhir_json:
        await redis_client.setex(
            f"raw_abha:{token}",
            7200,
            json.dumps(raw_fhir_json)
        )

    # Audit log — persists permanently, no TTL
    await redis_client.rpush("audit_log", json.dumps({
        "token":   token,
        "action":  "patient_added",
        "score":   ai_data.get("risk_score", 0),
        "time":    __import__("time").time()
    }))


async def get_doctor_dashboard():
    """Returns all patients sorted highest risk first."""
    tokens = await redis_client.zrange("triage_queue", 0, -1)

    dashboard_data = []
    for token in tokens:
        data = await redis_client.hgetall(f"patient:{token}")
        if data:
            data["abnormalities"] = json.loads(data.get("abnormalities", "[]"))
            dashboard_data.append({"token": token, "data": data})

    return dashboard_data


async def get_raw_patient_records(token):
    """Returns FHIR data with expiry status. Never silent on expiry."""
    raw_key = f"raw_abha:{token}"

    pipe = redis_client.pipeline()
    await pipe.get(raw_key)
    await pipe.ttl(raw_key)
    raw_data, ttl_remaining = await pipe.execute()

    if raw_data:
        return {
            "status":           "available",
            "data":             json.loads(raw_data),
            "expires_in_seconds": ttl_remaining,
            "warning":          "EXPIRING_SOON" if ttl_remaining < 600 else None
        }
    return {
        "status":  "expired",
        "data":    None,
        "warning": "FHIR records expired. Proceed without patient history."
    }


async def log_fhir_access(token, doctor_id="unknown"):
    """Call this when a doctor views FHIR records."""
    await redis_client.rpush("audit_log", json.dumps({
        "token":     token,
        "doctor":    doctor_id,
        "action":    "viewed_fhir",
        "time":      __import__("time").time()
    }))
import redis
import json

# Connecting to YOUR Upstash Cloud Redis
redis_client = redis.from_url("rediss://default:AXjlAAIncDE4NjBkOGVlNzBjNzE0ZDhkOTY2YzQyM2QzYzA2NjlkZnAxMzA5NDk@helping-heron-30949.upstash.io:6379", decode_responses=True)

def add_patient_to_queue(token, ai_data, raw_fhir_json=None):
    """Adds a patient to the priority queue AND handles the 2-hour ABHA consent."""
    
    # --- ACTION A: THE PERMANENT AI SUMMARY (Using your existing zadd logic) ---
    patient_info = json.dumps(ai_data)
    
    # Redis sorted sets sort ascending. We want the highest risk first, so we make it negative!
    priority_score = -int(ai_data.get("risk_score", 0)) 
    
    # Add to the "triage_queue" sorted set
    redis_client.zadd("triage_queue", {f"{token}::{patient_info}": priority_score})
    
    # --- ACTION B: THE TEMPORARY RAW DATA (THE 2-HOUR SELF-DESTRUCT) ---
    if raw_fhir_json:
        raw_key = f"raw_abha:{token}"
        
        # Save the raw JSON
        redis_client.set(raw_key, json.dumps(raw_fhir_json))
        
        # 🔥 Set the strict Time-To-Live (TTL) timer to 7200 seconds (2 hours)
        redis_client.expire(raw_key, 7200) 
        
        print(f"🔒 Raw ABHA data cached for Token {token}. Self-destruct in exactly 2 hours.")

def get_doctor_dashboard():
    """Retrieves all patients, perfectly sorted from highest risk to lowest."""
    # Get the list from Redis using your existing zrange logic
    raw_queue = redis_client.zrange("triage_queue", 0, -1)
    
    dashboard_data = []
    for item in raw_queue:
        token, info_str = item.split("::", 1)
        info = json.loads(info_str)
        dashboard_data.append({"token": token, "data": info})
        
    return dashboard_data

def get_raw_patient_records(token):
    """
    The Doctor clicks 'View Past Reports'.
    If within 2 hours, returns the FHIR data. If expired, returns None.
    """
    raw_key = f"raw_abha:{token}"
    raw_data = redis_client.get(raw_key)
    
    if raw_data:
        return json.loads(raw_data) # Within 2 hours! Data is still here.
    else:
        return None # 🔒 ACCESS EXPIRED! Redis deleted it.
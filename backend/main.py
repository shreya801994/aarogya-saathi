import uvicorn
import asyncio
from fastapi import FastAPI, File, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from quantum_security import generate_quantum_token
from ai_scanner import analyze_and_triage
from redis_db import (
    add_patient_to_queue,
    get_doctor_dashboard,
    get_raw_patient_records,
    redis_client
)
from fhir_mock import fetch_mock_fhir_bundle
from otp_service import send_otp, verify_otp

app = FastAPI(
    title="Quantum Triage System",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── WebSocket connection manager ───────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.active_connections.remove(conn)

manager = ConnectionManager()


# ── WebSocket ──────────────────────────────────────────────────────────────────

@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        patients = await get_doctor_dashboard()
        await websocket.send_json({"type": "full_queue", "patients": patients})
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ── OTP ────────────────────────────────────────────────────────────────────────

@app.post("/api/send-otp")
async def send_otp_route(
    abha_id: str = Form(...),
    phone:   str = Form(...)
):
    if not phone.startswith("+"):
        return JSONResponse(
            {"status": "failed", "reason": "Phone must include country code e.g. +919876543210"},
            status_code=400
        )
    result = send_otp(phone)
    if result["status"] == "failed":
        return JSONResponse(
            {"status": "failed", "reason": result.get("reason", "Unknown error")},
            status_code=503
        )
    return {"status": "sent"}


@app.post("/api/verify-otp")
async def verify_otp_route(
    phone: str = Form(...),
    otp:   str = Form(...)
):
    if verify_otp(phone, otp):
        return {"status": "verified"}
    return JSONResponse({"status": "failed"}, status_code=400)


# ── Patient upload ─────────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_report(
    file:          UploadFile = File(None),
    symptoms:      str = Form("No symptoms reported."),
    audio_file:    UploadFile = File(None),
    abha_id:       str = Form(""),
    abha_verified: str = Form("false"),
    attendant_mode:str = Form("false"),
    consent:       str = Form("no")
):
    image_data = await file.read()       if file       and file.filename       else None
    audio_data = await audio_file.read() if audio_file and audio_file.filename else None

    token = await generate_quantum_token(redis_client)

    fhir_data = None
    if consent == "yes" and abha_verified == "true" and abha_id:
        fhir_data = fetch_mock_fhir_bundle(abha_id)

    if attendant_mode == "true":
        symptoms = f"[ATTENDANT REPORTING]: {symptoms}"

    ai_data = await analyze_and_triage(image_data, symptoms, audio_data, fhir_data)

    await add_patient_to_queue(token, ai_data, fhir_data)

    patients = await get_doctor_dashboard()
    await manager.broadcast({"type": "queue_update", "patients": patients})

    return {
        "status":    "success",
        "token":     token,
        "risk_score": ai_data.get("risk_score"),
        "summary":   ai_data.get("summary"),
        "fallback":  ai_data.get("fallback", False)
    }


# ── Dashboard ──────────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
async def dashboard_data():
    patients = await get_doctor_dashboard()
    return {"patients": patients}


# ── FHIR records ───────────────────────────────────────────────────────────────

@app.get("/api/records/{token}")
async def get_records(token: str):
    return await get_raw_patient_records(token)


# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Quantum Triage System"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
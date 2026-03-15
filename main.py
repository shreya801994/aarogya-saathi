from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import HTMLResponse
import uvicorn
import json

from quantum_security import generate_quantum_token
from ai_scanner import analyze_and_triage
from redis_db import add_patient_to_queue, get_doctor_dashboard, get_raw_patient_records

app = FastAPI(title="Quantum Triage System")

# --- MOCK ABDM GATEWAY (Simulates the Government API) ---
def fetch_mock_fhir_bundle(abha_id):
    """Returns different FHIR JSON payloads based on the ABHA ID entered for testing."""
    
    # PROFILE 1: The Cardiac Risk Patient (Try entering ABHA ID: 2222)
    if "2222" in abha_id:
        return {
            "resourceType": "Bundle",
            "entry": [
                {"resource": {"resourceType": "Patient", "id": abha_id, "name": [{"text": "Anil Sharma"}], "gender": "male"}},
                {"resource": {"resourceType": "Condition", "clinicalStatus": {"coding": [{"code": "active"}]}, "code": {"coding": [{"display": "Coronary artery disease"}]}}},
                {"resource": {"resourceType": "AllergyIntolerance", "criticality": "high", "code": {"coding": [{"display": "Aspirin"}]}}},
                {"resource": {"resourceType": "Observation", "status": "final", "code": {"coding": [{"display": "Heart rate"}]}, "valueQuantity": {"value": 110, "unit": "beats/minute"}}}
            ]
        }
        
    # PROFILE 2: The Diabetic Patient (Try entering ABHA ID: 3333)
    elif "3333" in abha_id:
        return {
            "resourceType": "Bundle",
            "entry": [
                {"resource": {"resourceType": "Patient", "id": abha_id, "name": [{"text": "Priya Patel"}], "gender": "female"}},
                {"resource": {"resourceType": "Condition", "clinicalStatus": {"coding": [{"code": "active"}]}, "code": {"coding": [{"display": "Type 2 Diabetes Mellitus"}]}}},
                {"resource": {"resourceType": "Observation", "status": "final", "code": {"coding": [{"display": "Fasting Blood Glucose"}]}, "valueQuantity": {"value": 180, "unit": "mg/dL"}}}
            ]
        }
        
    # DEFAULT PROFILE: The Asthma Patient (Fallback for any other ID, e.g., 1111)
    return {
      "resourceType": "Bundle",
      "entry": [
        {"resource": {"resourceType": "Patient", "id": abha_id, "name": [{"text": "Ramesh Kumar"}], "gender": "male"}},
        {"resource": {"resourceType": "Condition", "clinicalStatus": {"coding": [{"code": "active"}]}, "code": {"coding": [{"display": "Asthma"}]}}},
        {"resource": {"resourceType": "AllergyIntolerance", "criticality": "high", "code": {"coding": [{"display": "Penicillin"}]}}},
        {"resource": {"resourceType": "Observation", "status": "final", "code": {"coding": [{"display": "Blood pressure"}]}, "component": [{"code": {"text": "Systolic"}, "valueQuantity": {"value": 155}}, {"code": {"text": "Diastolic"}, "valueQuantity": {"value": 95}}]}}
      ]
    }

# --- PATIENT UPLOAD PAGE ---
@app.get("/", response_class=HTMLResponse)
def home():
    return """
    <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: sans-serif; text-align: center; padding: 30px; background: #f4f7f6; }
                .container { background: white; padding: 30px; border-radius: 10px; display: inline-block; box-shadow: 0px 4px 6px rgba(0,0,0,0.1); text-align: left; max-width: 450px; width: 100%; box-sizing: border-box; }
                label { font-weight: bold; display: block; margin-bottom: 5px; margin-top: 15px; }
                input[type="text"], input[type="file"], textarea, select { width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 5px; border: 1px solid #ccc; box-sizing: border-box; }
                .btn-submit { padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 20px; font-size: 16px; }
                .btn-primary { padding: 10px 15px; background: #1abc9c; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; margin-bottom: 10px;}
                
                /* Attendant & Consent Styles */
                .highlight-box { background: #fdf2e9; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e67e22; }
                .radio-group { margin-bottom: 15px; font-size: 15px; }
                .radio-group input { width: auto; margin-right: 5px; }

                /* ABHA Box - Hidden by default until consent is given */
                .abha-box { background: #e8f8f5; border: 1px solid #1abc9c; padding: 15px; border-radius: 8px; margin-bottom: 20px; margin-top: 15px; display: none;}
                .abha-box h3 { margin-top: 0; color: #16a085; font-size: 16px; }
                
                /* MIC BUTTON STYLES */
                .mic-container { display: flex; align-items: center; gap: 15px; margin-top: 10px; margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0; }
                .mic-btn { width: 50px; height: 50px; border-radius: 50%; border: none; background: #3498db; color: white; font-size: 24px; cursor: pointer; display: flex; justify-content: center; align-items: center; box-shadow: 0px 4px 6px rgba(0,0,0,0.2); transition: all 0.3s ease; }
                .mic-btn:hover { transform: scale(1.05); }
                .mic-btn.recording { background: #e74c3c; animation: pulse 1.5s infinite; }
                .mic-btn.saved { background: #27ae60; }
                .mic-text { font-weight: bold; color: #555; font-size: 15px; }
                
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(231, 76, 60, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
                }
                
                #langToggle { float: right; padding: 5px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <select id="langToggle" onchange="switchLanguage()">
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
            </select>
            
            <h1 id="titleText">⚕️ Patient Portal</h1>
            <p id="subText">Upload your report and tell us your symptoms.</p>
            
            <div class="container">
                <form action="/upload" method="post" enctype="multipart/form-data">
                    
                    <div class="highlight-box">
                        <input type="checkbox" id="attendant_mode" name="attendant_mode" value="true" style="width: auto;">
                        <label for="attendant_mode" id="lblAttendant" style="display:inline; font-weight:normal; font-size: 15px;">I am an attendant filling this on behalf of the patient</label>
                    </div>

                    <label id="lblConsent" style="color: #2c3e50;">Do you want the doctor to be able to see reports of your past illnesses?</label>
                    <div class="radio-group">
                        <input type="radio" id="consent_yes" name="consent" value="yes" onchange="toggleAbhaBox()"> 
                        <label for="consent_yes" id="lblConsentYes" style="display:inline; font-weight:normal; margin-right: 15px;">Yes</label>
                        
                        <input type="radio" id="consent_no" name="consent" value="no" onchange="toggleAbhaBox()" checked> 
                        <label for="consent_no" id="lblConsentNo" style="display:inline; font-weight:normal;">No</label>
                    </div>

                    <div class="abha-box" id="abhaContainer">
                        <h3 id="lblAbhaTitle">🏥 Link Past Records</h3>
                        <div id="abhaInputArea">
                            <input type="text" id="abha_id" name="abha_id" placeholder="Enter 14-digit ABHA ID">
                            <button type="button" class="btn-primary" id="btnSendOtp" onclick="showOtpBox()">Send Secure OTP</button>
                        </div>
                        <div id="otpArea" style="display: none; margin-top: 10px;">
                            <input type="text" id="otp_code" placeholder="Enter 6-digit OTP">
                            <button type="button" class="btn-primary" style="background:#27ae60;" id="btnVerifyOtp" onclick="verifyOtp()">Verify & Link</button>
                        </div>
                        <p id="abhaSuccessMsg" style="display:none; color:#27ae60; font-weight:bold; font-size:14px;">✅ Records linked securely (Expires in 2 hrs)</p>
                        <input type="hidden" id="abha_verified" name="abha_verified" value="false">
                    </div>

                    <label id="lblReport">1. Upload Medical Report (Image):</label>
                    <input type="file" name="file" accept="image/*">
                    
                    <label id="lblSymptoms">2. Write Symptoms (Optional):</label>
                    <textarea name="symptoms" id="symptomsBox" rows="3" placeholder="e.g., I have a fever..."></textarea>
                    
                    <label id="lblAudio">3. Voice Note (Optional):</label>
                    <div class="mic-container">
                        <button type="button" class="mic-btn" id="micButton" onclick="toggleRecording()">🎤</button>
                        <span class="mic-text" id="micText">Click to record</span>
                    </div>
                    <input type="file" name="audio_file" id="hiddenAudioInput" style="display: none;">
                    
                    <button type="submit" class="btn-submit" id="btnSubmit">Submit for Triage</button>
                </form>
            </div>

            <script>
                // --- TOGGLE ABHA BOX BASED ON CONSENT ---
                function toggleAbhaBox() {
                    const yesChecked = document.getElementById('consent_yes').checked;
                    document.getElementById('abhaContainer').style.display = yesChecked ? 'block' : 'none';
                }

                // --- ABHA UI LOGIC ---
                function showOtpBox() {
                    const abhaVal = document.getElementById('abha_id').value;
                    if(abhaVal.length < 4) { alert("Please enter ABHA ID."); return; }
                    document.getElementById('btnSendOtp').style.display = 'none';
                    document.getElementById('otpArea').style.display = 'block';
                }
                function verifyOtp() {
                    document.getElementById('otpArea').style.display = 'none';
                    document.getElementById('abhaInputArea').style.display = 'none';
                    document.getElementById('abhaSuccessMsg').style.display = 'block';
                    document.getElementById('abha_verified').value = "true";
                }

                // --- LANGUAGE DICTIONARY ---
                const translations = {
                    en: {
                        title: "⚕️ Patient Portal", sub: "Upload your report and tell us your symptoms.",
                        attendant: "I am an attendant filling this on behalf of the patient",
                        consent: "Do you want the doctor to be able to see reports of your past illnesses?",
                        yes: "Yes", no: "No",
                        report: "1. Upload Medical Report (Image):", symptoms: "2. Write Symptoms (Optional):",
                        symptomsPh: "e.g., I have a fever...", audio: "3. Voice Note (Optional):",
                        clickToRecord: "Click to record", recording: "Recording... Click to stop",
                        saved: "Audio saved! (Click to redo)", submit: "Submit for Triage"
                    },
                    hi: {
                        title: "⚕️ मरीज़ पोर्टल", sub: "अपनी रिपोर्ट अपलोड करें और हमें अपने लक्षण बताएं।",
                        attendant: "मैं मरीज की ओर से यह फॉर्म भर रहा/रही हूँ (अटेंडेंट)",
                        consent: "क्या आप चाहते हैं कि डॉक्टर आपकी पुरानी बीमारियों की रिपोर्ट देख सकें?",
                        yes: "हाँ (Yes)", no: "नहीं (No)",
                        report: "1. मेडिकल रिपोर्ट अपलोड करें (चित्र):", symptoms: "2. वर्तमान लक्षण लिखें (वैकल्पिक):",
                        symptomsPh: "उदाहरण: मुझे बुखार है...", audio: "3. वॉयस नोट (वैकल्पिक):",
                        clickToRecord: "रिकॉर्ड करने के लिए क्लिक करें", recording: "रिकॉर्ड हो रहा है... रोकने के लिए क्लिक करें",
                        saved: "ऑडियो सेव हो गया! (दोबारा करने के लिए क्लिक करें)", submit: "ट्राइएज के लिए जमा करें"
                    }
                };

                let currentLang = 'en';
                let isRecording = false;
                let hasRecorded = false;

                function switchLanguage() {
                    currentLang = document.getElementById('langToggle').value;
                    const t = translations[currentLang];
                    document.getElementById('titleText').innerText = t.title;
                    document.getElementById('subText').innerText = t.sub;
                    document.getElementById('lblAttendant').innerText = t.attendant;
                    document.getElementById('lblConsent').innerText = t.consent;
                    document.getElementById('lblConsentYes').innerText = t.yes;
                    document.getElementById('lblConsentNo').innerText = t.no;
                    document.getElementById('lblReport').innerText = t.report;
                    document.getElementById('lblSymptoms').innerText = t.symptoms;
                    document.getElementById('symptomsBox').placeholder = t.symptomsPh;
                    document.getElementById('lblAudio').innerText = t.audio;
                    document.getElementById('btnSubmit').innerText = t.submit;
                    
                    if (isRecording) document.getElementById('micText').innerText = t.recording;
                    else if (hasRecorded) document.getElementById('micText').innerText = t.saved;
                    else document.getElementById('micText').innerText = t.clickToRecord;
                }

                // --- REAL-TIME AUDIO RECORDING LOGIC ---
                let mediaRecorder;
                let audioChunks = [];

                async function toggleRecording() {
                    if (!isRecording) await startRecording();
                    else stopRecording();
                }

                async function startRecording() {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        mediaRecorder = new MediaRecorder(stream);
                        mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
                        mediaRecorder.onstop = () => {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                            const audioFile = new File([audioBlob], "live_recording.webm", { type: 'audio/webm' });
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(audioFile);
                            document.getElementById('hiddenAudioInput').files = dataTransfer.files;
                            
                            hasRecorded = true;
                            const micBtn = document.getElementById('micButton');
                            micBtn.classList.remove('recording'); micBtn.classList.add('saved');
                            micBtn.innerText = '✅';
                            
                            const t = translations[currentLang];
                            document.getElementById('micText').innerText = t.saved;
                            document.getElementById('micText').style.color = '#27ae60';
                        };
                        audioChunks = [];
                        mediaRecorder.start();
                        isRecording = true; hasRecorded = false;
                        
                        const micBtn = document.getElementById('micButton');
                        micBtn.classList.remove('saved'); micBtn.classList.add('recording');
                        micBtn.innerText = '⏹️';
                        
                        const t = translations[currentLang];
                        document.getElementById('micText').innerText = t.recording;
                        document.getElementById('micText').style.color = '#e74c3c';
                    } catch (err) {
                        alert("Microphone access denied or not available. / माइक्रोफोन एक्सेस उपलब्ध नहीं है।");
                    }
                }

                function stopRecording() {
                    if(mediaRecorder && mediaRecorder.state !== "inactive") {
                        mediaRecorder.stop();
                        isRecording = false;
                    }
                }
            </script>
        </body>
    </html>
    """

# --- THE UPLOAD ENDPOINT ---
@app.post("/upload", response_class=HTMLResponse)
async def upload_report(
    file: UploadFile = File(None),
    symptoms: str = Form("No symptoms reported."),
    audio_file: UploadFile = File(None),
    abha_id: str = Form(""),
    abha_verified: str = Form("false"),
    attendant_mode: str = Form("false"),  # Catches the new attendant checkbox
    consent: str = Form("no")             # Catches the new consent radio button
):
    image_data = await file.read() if file and file.filename else None
    audio_data = await audio_file.read() if audio_file and audio_file.filename else None
    
    token = generate_quantum_token()
    fhir_data = None
    
    # Strictly enforce consent: Only fetch if they explicitly chose "yes" AND verified the OTP
    if consent == "yes" and abha_verified == "true":
        print(f"✅ Patient Consent Granted & ABHA Verified. Fetching records...")
        fhir_data = fetch_mock_fhir_bundle(abha_id)
    else:
        print(f"🔒 Consent denied or ABHA not linked. Bypassing past records.")
    
    # We can pass attendant_mode to the AI if we want it to adjust its tone/context
    if attendant_mode == "true":
        symptoms = f"[ATTENDANT REPORTING]: {symptoms}"

    # Send everything to our updated multi-modal AI
    ai_data = analyze_and_triage(image_data, symptoms, audio_data, fhir_data)
    
    # Save to Redis (Includes 2-hour TTL if FHIR data exists)
    add_patient_to_queue(token, ai_data, fhir_data)
    
    return f"""
    <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #e8f8f5;">
            <h1 style="color: #27ae60;">Upload Successful!</h1>
            <h2>Your Secure Patient ID: <b>{token}</b></h2>
            <p>Your report, symptoms, and voice note have been securely analyzed and placed in the triage queue.</p>
            <br>
            <a href="/" style="padding: 10px; background: #95a5a6; color: white; text-decoration: none; border-radius: 5px;">Upload Another</a> 
            <span style="margin: 0 15px;">|</span>
            <a href="/doctor" style="padding: 10px; background: #2c3e50; color: white; text-decoration: none; border-radius: 5px;">View Doctor Dashboard</a>
        </body>
    </html>
    """

# --- DOCTOR DASHBOARD PAGE ---
@app.get("/doctor", response_class=HTMLResponse)
def doctor_dashboard():
    patients = get_doctor_dashboard()
    
    html = """
    <html>
        <head>
            <script>
                async function viewRecords(token) {
                    const response = await fetch('/api/records/' + token);
                    const data = await response.json();
                    if (data.status === "expired") {
                        alert("🔒 Access Denied: The 2-hour consent window has expired. Data deleted.");
                    } else if (data.status === "none") {
                        alert("No past records were linked by this patient.");
                    } else {
                        alert("🔓 SECURE FHIR DATA RETRIEVED:\\n\\n" + JSON.stringify(data.data, null, 2));
                    }
                }
            </script>
        </head>
        <body style="font-family: sans-serif; padding: 40px; background: #2c3e50; color: white;">
            <h1>👨‍⚕️ Doctor Dashboard</h1>
            <p>Live Triage Queue (Translated to English & Sorted by Risk Score)</p>
            <table style="width: 100%; text-align: left; border-collapse: collapse; background: #34495e; border-radius: 10px; overflow: hidden;">
                <tr style="background: #e74c3c;">
                    <th style="padding: 15px;">Token</th>
                    <th style="padding: 15px;">Risk Score</th>
                    <th style="padding: 15px;">Abnormalities / Symptoms</th>
                    <th style="padding: 15px;">Clinical Summary</th>
                    <th style="padding: 15px;">Past Records (TTL)</th>
                </tr>
    """
    for p in patients:
        token = p['token']
        score = p['data'].get('risk_score', 0)
        abnormalities = p['data'].get('abnormalities', '')
        summary = p['data'].get('summary', '')
        color = "#c0392b" if score >= 80 else "#d35400" if score >= 50 else "#27ae60"
        
        html += f"""
                <tr style="border-bottom: 1px solid #7f8c8d;">
                    <td style="padding: 15px; font-weight: bold; font-size: 18px;">{token}</td>
                    <td style="padding: 15px; font-weight: bold; color: {color}; font-size: 24px;">{score}</td>
                    <td style="padding: 15px;">{abnormalities}</td>
                    <td style="padding: 15px; font-size: 14px; line-height: 1.5;">{summary}</td>
                    <td style="padding: 15px;">
                        <button onclick="viewRecords('{token}')" style="padding:8px 12px; background:#3498db; color:white; border:none; border-radius:4px; cursor:pointer;">
                            View FHIR Data
                        </button>
                    </td>
                </tr>
        """
    html += "</table></body></html>"
    return html

# --- NEW API ROUTE: FETCH TTL RECORDS ---
@app.get("/api/records/{token}")
def get_records(token: str):
    """Called when the doctor clicks 'View FHIR Data'."""
    raw_data = get_raw_patient_records(token)
    if raw_data:
        return {"status": "success", "data": raw_data}
    
    # We don't know if it expired or if they never attached it. We'll default to expired for the demo.
    return {"status": "expired"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
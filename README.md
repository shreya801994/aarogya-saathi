# 🏥 GenAI Emergency Triage System

An AI-powered, multimodal emergency triage platform that assists healthcare professionals in prioritizing patients based on the severity of their medical condition. The system analyzes patient symptoms submitted through **voice, text, medical reports, and images** using **Google Gemini 2.5 Flash**, generating structured clinical summaries, risk scores, and triage recommendations in real time.

Designed with healthcare privacy in mind, the platform incorporates secure patient consent, anonymized record handling, and temporary storage mechanisms to simulate real-world digital healthcare workflows.

---

# 🚀 Features

## 🤖 Multimodal Generative AI

- Processes medical reports, diagnostic images, typed symptoms, and recorded voice inputs.
- Uses **Google Gemini 2.5 Flash** to generate:
  - Clinical summaries
  - Risk assessment
  - Detected abnormalities
  - Emergency triage recommendations
- Supports multilingual symptom descriptions with automatic translation for healthcare professionals.

---

## 🩺 Intelligent Emergency Triage

The platform prioritizes patients using AI-generated clinical risk scores.

| Priority | Description |
|-----------|-------------|
| 🔴 Critical | Immediate medical attention required |
| 🟠 Urgent | High priority |
| 🟢 Stable | Standard consultation |

The doctor dashboard updates dynamically, allowing healthcare professionals to quickly identify high-risk patients.

---

## 🔐 Secure Healthcare Workflow

To improve privacy and simulate healthcare compliance, the system includes:

- Patient identity tokenization
- OTP-based patient consent verification
- Temporary healthcare record storage using Redis TTL
- Secure retrieval of previous medical history

Sensitive records automatically expire after a predefined duration.

---

## 🏥 ABDM/FHIR Simulation

The application simulates interoperability with India's digital healthcare ecosystem.

Features include:

- Mock ABHA ID verification
- Consent-driven medical history retrieval
- Structured FHIR-based healthcare records
- Electronic Health Record (EHR) processing

---

## 🎤 Voice-Based Symptom Analysis

Patients can describe symptoms using voice recordings.

The system:

- Accepts recorded audio
- Converts speech into clinical context
- Handles multilingual inputs
- Includes the extracted information in the final AI assessment

---

## 📊 Real-Time Doctor Dashboard

Doctors receive a live dashboard displaying:

- Patient queue
- Risk score
- Clinical summary
- AI-generated recommendations
- Previous healthcare records (after consent)

This enables faster and more informed emergency decision-making.

---

# 🏗️ System Workflow

```text
Patient Registration
        │
        ▼
Medical Reports + Images + Voice + Symptoms
        │
        ▼
Patient Consent Verification
        │
        ▼
Patient Data Tokenization
        │
        ▼
Gemini 2.5 Flash Analysis
        │
        ▼
Clinical Summary
Risk Score
Detected Abnormalities
Triage Recommendation
        │
        ▼
Redis Queue
        │
        ▼
Doctor Dashboard
```

---

# 🧠 AI Pipeline

The platform combines multiple AI capabilities:

- Multimodal document understanding
- Medical image interpretation
- Clinical report summarization
- Voice-based symptom understanding
- Risk score prediction
- Context-aware clinical reasoning
- Structured JSON response generation

---

# 🛠 Technology Stack

## Backend

- Python
- FastAPI
- Uvicorn

## Artificial Intelligence

- Google Gemini 2.5 Flash
- Generative AI
- Prompt Engineering
- Multimodal AI

## Database

- Redis
- In-memory Queue
- TTL Storage

## Frontend

- HTML5
- CSS3
- JavaScript
- MediaRecorder API

## Healthcare Standards

- FHIR JSON
- ABDM Workflow Simulation
- Electronic Health Records (EHR)

---

# 📂 Project Structure

```
.
├── main.py
├── ai_scanner.py
├── quantum_security.py
├── redis_db.py
├── static/
├── templates/
├── uploads/
├── requirements.txt
└── README.md
```

---

# ⚙️ Installation

## 1. Clone Repository

```bash
git clone https://github.com/shreya801994/aarogya-saathi.git

cd aarogya-saathi
```

---

## 2. Create Virtual Environment

### Windows

```bash
python -m venv venv

venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv

source venv/bin/activate
```

---

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

or

```bash
pip install fastapi uvicorn redis google-genai python-multipart
```

---

## 4. Configure Environment Variables

Create a `.env` file.

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

REDIS_HOST=localhost

REDIS_PORT=6379
```

---

## 5. Start Redis

Using Docker

```bash
docker run -d \
-p 6379:6379 \
redis/redis-stack-server:latest
```

---

## 6. Run Application

```bash
uvicorn main:app --reload
```

Open

```
http://127.0.0.1:8000
```

---

# 🧪 Demo Guide

Use the following sample patient IDs.

## Patient 2222

- Coronary Artery Disease
- Aspirin Allergy
- Elevated Heart Rate

---

## Patient 3333

- Type 2 Diabetes
- High Blood Glucose

---

## Any Other ID

- Asthma
- Penicillin Allergy
- Elevated Blood Pressure

---

### Steps

1. Open the patient portal.
2. Provide consent.
3. Enter a mock ABHA ID.
4. Verify OTP.
5. Upload medical reports.
6. Record symptoms.
7. Submit.
8. Open the doctor dashboard to view AI-generated triage results.

---

# 🔒 Privacy & Security

The platform incorporates multiple privacy-focused mechanisms including:

- Identity tokenization
- OTP verification
- Consent-based record retrieval
- Temporary Redis storage
- Automatic data expiration using TTL

No permanent patient records are stored by the application.

---

# 📈 Future Improvements

- Integration with real ABDM APIs
- Fine-tuned medical language models
- DICOM image support
- OCR for handwritten prescriptions
- Explainable AI (XAI)
- Predictive patient outcome analytics
- Real-time hospital bed availability
- Multi-language support using speech translation
- Docker and Kubernetes deployment
- CI/CD pipeline

---

# 👩‍💻 Author

**Shreya Dubey**

GitHub: https://github.com/shreya801994

---

# ⭐ If you found this project interesting, consider giving it a star!

const API_BASE = "http://localhost:8000";

let isRecording  = false;
let hasRecorded  = false;
let mediaRecorder;
let audioChunks  = [];
let audioBlob    = null;
let abhaVerified = false;
let currentLang  = 'en';

const translations = {
  en: {
    title:         "Patient Portal",
    sub:           "Upload your report and tell us your symptoms.",
    attendant:     "I am an attendant filling this on behalf of the patient",
    consent:       "Do you want the doctor to see your past medical records?",
    yes:           "Yes",
    no:            "No",
    report:        "1. Upload Medical Report (Image):",
    symptoms:      "2. Write Symptoms (Optional):",
    symptomsPh:    "e.g., I have a fever...",
    audio:         "3. Voice Note (Optional):",
    clickToRecord: "Click to record",
    recording:     "Recording... click to stop",
    saved:         "Audio saved! Click to redo",
    submit:        "Submit for Triage"
  },
  hi: {
    title:         "मरीज़ पोर्टल",
    sub:           "अपनी रिपोर्ट अपलोड करें और लक्षण बताएं।",
    attendant:     "मैं मरीज की ओर से यह फॉर्म भर रहा/रही हूँ",
    consent:       "क्या आप चाहते हैं कि डॉक्टर पुरानी रिपोर्ट देखें?",
    yes:           "हाँ",
    no:            "नहीं",
    report:        "1. मेडिकल रिपोर्ट अपलोड करें:",
    symptoms:      "2. लक्षण लिखें (वैकल्पिक):",
    symptomsPh:    "उदाहरण: मुझे बुखार है...",
    audio:         "3. वॉयस नोट (वैकल्पिक):",
    clickToRecord: "रिकॉर्ड करने के लिए क्लिक करें",
    recording:     "रिकॉर्ड हो रहा है...",
    saved:         "ऑडियो सेव हो गया!",
    submit:        "ट्राइएज के लिए जमा करें"
  }
};

function switchLanguage() {
  currentLang = document.getElementById('langToggle').value;
  const t     = translations[currentLang];
  document.getElementById('titleText').innerText     = t.title;
  document.getElementById('subText').innerText       = t.sub;
  document.getElementById('lblAttendant').innerText  = t.attendant;
  document.getElementById('lblConsent').innerText    = t.consent;
  document.getElementById('lblConsentYes').innerText = t.yes;
  document.getElementById('lblConsentNo').innerText  = t.no;
  document.getElementById('lblReport').innerText     = t.report;
  document.getElementById('lblSymptoms').innerText   = t.symptoms;
  document.getElementById('symptomsBox').placeholder = t.symptomsPh;
  document.getElementById('lblAudio').innerText      = t.audio;
  document.getElementById('btnSubmit').innerText     = t.submit;
  document.getElementById('micText').innerText =
    isRecording ? t.recording : hasRecorded ? t.saved : t.clickToRecord;
}

function toggleAbhaBox() {
  const yes = document.getElementById('consent_yes').checked;
  document.getElementById('abhaContainer').classList.toggle('hidden', !yes);
}

async function sendOtp() {
  const abhaId = document.getElementById('abha_id').value;
  const phone  = document.getElementById('patient_phone').value;

  if (abhaId.length < 4) {
    alert("Please enter your ABHA ID."); return;
  }
  if (!phone.startsWith('+')) {
    alert("Enter phone with country code. Example: +919876543210"); return;
  }

  const btn     = document.getElementById('btnSendOtp');
  btn.innerText = 'Sending...';
  btn.disabled  = true;

  const form = new FormData();
  form.append('abha_id', abhaId);
  form.append('phone',   phone);

  try {
    const res  = await fetch(`${API_BASE}/api/send-otp`,
                   { method: 'POST', body: form });
    const data = await res.json();

    if (data.status === 'sent') {
      btn.classList.add('hidden');
      document.getElementById('otpArea').classList.remove('hidden');
    } else {
      alert(`Could not send OTP: ${data.reason || 'Unknown error'}`);
      btn.innerText = 'Send Secure OTP';
      btn.disabled  = false;
    }
  } catch {
    alert('Could not reach server. Is the backend running?');
    btn.innerText = 'Send Secure OTP';
    btn.disabled  = false;
  }
}

async function verifyOtp() {
  const phone = document.getElementById('patient_phone').value;
  const otp   = document.getElementById('otp_code').value;

  const form = new FormData();
  form.append('phone', phone);
  form.append('otp',   otp);

  try {
    const res = await fetch(`${API_BASE}/api/verify-otp`,
                  { method: 'POST', body: form });
    if (res.ok) {
      abhaVerified = true;
      document.getElementById('otpArea').classList.add('hidden');
      document.getElementById('abhaInputArea').classList.add('hidden');
      document.getElementById('abhaSuccessMsg').classList.remove('hidden');
    } else {
      alert("Incorrect OTP. Please try again.");
    }
  } catch {
    alert('Could not reach server. Is the backend running?');
  }
}

async function toggleRecording() {
  if (!isRecording) await startRecording();
  else stopRecording();
}

async function startRecording() {
  try {
    const stream  = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks   = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      audioBlob   = new Blob(audioChunks, { type: 'audio/webm' });
      hasRecorded = true;
      const btn   = document.getElementById('micButton');
      btn.classList.remove('recording');
      btn.classList.add('saved');
      btn.innerText = '✅';
      document.getElementById('micText').innerText =
        translations[currentLang].saved;
    };

    mediaRecorder.start();
    isRecording = true;
    const btn   = document.getElementById('micButton');
    btn.classList.add('recording');
    btn.innerText = '⏹️';
    document.getElementById('micText').innerText =
      translations[currentLang].recording;

  } catch {
    alert("Microphone access denied. Please allow microphone and try again.");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    isRecording = false;
  }
}

async function submitForm() {
  const btn     = document.getElementById('btnSubmit');
  btn.innerText = 'Analyzing...';
  btn.disabled  = true;

  const form = new FormData();

  const reportFile = document.getElementById('reportFile').files[0];
  if (reportFile) form.append('file', reportFile);

  form.append('symptoms',
    document.getElementById('symptomsBox').value || 'No symptoms reported.');
  form.append('attendant_mode',
    document.getElementById('attendant_mode').checked ? 'true' : 'false');
  form.append('consent',
    document.getElementById('consent_yes').checked ? 'yes' : 'no');
  form.append('abha_id',
    document.getElementById('abha_id').value || '');
  form.append('abha_verified',
    abhaVerified ? 'true' : 'false');

  if (audioBlob) {
    form.append('audio_file',
      new File([audioBlob], 'recording.webm', { type: 'audio/webm' }));
  }

  try {
    const res  = await fetch(`${API_BASE}/api/upload`,
                   { method: 'POST', body: form });
    const data = await res.json();

    document.getElementById('tokenDisplay').innerText =
      data.token;
    document.getElementById('riskDisplay').innerText  =
      `Risk Score: ${data.risk_score}`;

    if (data.fallback) {
      document.getElementById('fallbackWarning').classList.remove('hidden');
    }

    document.getElementById('resultBox').classList.remove('hidden');
    document.getElementById('resultBox').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    alert('Submission failed. Is the backend running at localhost:8000?');
    console.error(err);
  }

  btn.innerText = translations[currentLang].submit;
  btn.disabled  = false;
}
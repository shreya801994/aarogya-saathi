import google.generativeai as genai
from PIL import Image
import io
import json
import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Safely fetch the API key from the environment variables
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found. Please set it in your .env file.")

genai.configure(api_key=api_key)

def analyze_and_triage(image_bytes, patient_symptoms="No symptoms reported.", audio_bytes=None, fhir_data=None): 
    """Analyzes the medical report, symptoms (Text/Audio), AND past FHIR records."""
    
    # We use 2.5-flash as it is highly efficient for multimodal tasks (audio+image+text)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # 1. Safely handle the image (in case they didn't upload one)
    image = None
    if image_bytes and len(image_bytes) > 0:
        try:
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            print(f"Warning: Could not process image. Error: {e}")
    
    # 2. Build the Master Prompt
    prompt = f"""
    You are an ER Triage AI. Analyze the patient's self-reported symptoms, any attached medical reports, and their past medical history.
    
    PATIENT'S CURRENT SYMPTOMS (TEXT): "{patient_symptoms}"
    
    IMPORTANT AUDIO INSTRUCTION: If an audio file is attached, LISTEN to it carefully. 
    The audio may be in Hindi, English, or a mix of both. Translate any spoken Hindi symptoms into English and factor them into your assessment.
    
    CRITICAL TRIAGE RULE: If the patient's audio or text reports severe symptoms (like chest pain, bleeding, shortness of breath, Neurological (Brain & Nerves), Systemic & Trauma), you MUST assign a high risk_score (80-100) and flag it as an emergency, EVEN IF the attached medical lab report looks completely normal. Symptoms override normal lab results!
    """
    
    # 3. Inject the Mock Government Data if it exists!
    if fhir_data:
        prompt += f"""
        
    --- VERIFIED PAST MEDICAL RECORDS (ABHA FHIR JSON) ---
    {json.dumps(fhir_data, indent=2)}
    
    CRITICAL FHIR INSTRUCTION: 
    Read the FHIR JSON above. Look specifically for "Condition" (past diseases) 
    and "AllergyIntolerance". Cross-reference these with the current presentation. 
    If they have an active chronic condition (like Asthma) and their current 
    symptoms are related, heavily increase their risk score. Always flag high-criticality allergies.
    """

    prompt += """
    You MUST respond in strict JSON format with exactly three keys:
    1. "summary": A brief clinical summary combining the lab findings, text symptoms, translated audio symptoms, and past FHIR records.
    2. "abnormalities": A list of critical abnormal findings, alarming symptoms, and any severe allergies/past conditions.
    3. "risk_score": An integer from 1 to 100 representing medical urgency (100 = life-threatening). 
    
    Do not include any markdown formatting, just the JSON.
    """
    
    # 4. Assemble the multimodal payload
    contents_to_send = [prompt]
    
    if image:
        contents_to_send.append(image)
        
    if audio_bytes and len(audio_bytes) > 0:
        contents_to_send.append({
            "mime_type": "audio/webm", # Browsers record in webm format!
            "data": audio_bytes
        })
    
    # 5. Call Gemini
    try:
        response = model.generate_content(
            contents_to_send, 
            generation_config=genai.types.GenerationConfig(
                temperature=0.0, # Keeps the AI strictly clinical and predictable
            )
        )
        
        # Clean the output to ensure perfect JSON parsing
        clean_text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(clean_text)
        
    except Exception as e:
        print("AI Triage Error:", e)
        # Fallback response so your app doesn't crash if Gemini timeouts
        return {
            "summary": "SYSTEM ERROR: Could not process AI Triage. Manual review required.",
            "abnormalities": "UNKNOWN - SYSTEM ERROR",
            "risk_score": 99 
        }
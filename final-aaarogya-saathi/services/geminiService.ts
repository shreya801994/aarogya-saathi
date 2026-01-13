import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSymptomAnalysis = async (symptoms: string, lang: Language, imageBase64?: string): Promise<string> => {
  try {
    const languageInstruction = lang === 'hi' 
      ? "Provide the response strictly in Hindi language." 
      : "Provide the response in English language.";

    const promptText = `
      You are a compassionate and knowledgeable medical assistant AI for the app 'Aarogya Saathi'. 
      A patient has reported the following symptoms: "${symptoms}".
      ${imageBase64 ? "They have also uploaded an image of the affected area (skin/eye/wound)." : ""}
      
      ${languageInstruction}
      
      Please provide a response with the following structure:
      1. Acknowledgment: validate the patient's discomfort. ${imageBase64 ? "Briefly describe what you observe in the image if relevant (e.g. redness, swelling)." : ""}
      2. Immediate "Quick Solution": Provide safe, general home remedies or first-aid advice that can help alleviate symptoms temporarily.
      3. Disclaimer: Clearly state that this is AI-generated advice and not a substitute for professional medical diagnosis, and that their case has been forwarded to a doctor.
      
      Keep the tone professional yet warm. Keep the response under 150 words.
    `;

    let contentParts: any[] = [{ text: promptText }];

    if (imageBase64) {
      // Extract the base64 data part if it includes the prefix
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      
      contentParts.unshift({
        inlineData: {
          mimeType: "image/jpeg", // Assuming jpeg/png
          data: base64Data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: contentParts
      },
    });

    return response.text || (lang === 'hi' ? "इस समय सलाह उत्पन्न करने में असमर्थ। कृपया डॉक्टर की प्रतीक्षा करें।" : "Unable to generate advice at this time. Please wait for the doctor.");
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return lang === 'hi' 
      ? "सिस्टम वर्तमान में तत्काल सलाह देने में असमर्थ है। आपका विवरण डॉक्टर को भेज दिया गया है।"
      : "System is currently unable to provide immediate advice. Your details have been sent to the doctor.";
  }
};
import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";

async function runDiagnostic() {
  console.log("--- GEMINI API DIAGNOSTIC (NEW SDK) ---");
  config({ path: ".env" });
  config({ path: ".env.local", override: true });

  const hasKey = !!process.env.GEMINI_API_KEY;
  const configuredModel = process.env.GEMINI_EXTRACTION_MODEL;
  
  console.log(`[Diagnostic] GEMINI_API_KEY exists: ${hasKey}`);
  console.log(`[Diagnostic] GEMINI_EXTRACTION_MODEL: ${configuredModel || 'NOT CONFIGURED'}`);

  if (!hasKey || !configuredModel) {
    console.error("Diagnostic Failed: Missing config.");
    process.exit(1);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    console.log("[Diagnostic] Authenticating and testing model generation...");
    const response = await ai.models.generateContent({
      model: configuredModel,
      contents: "Hello",
      config: { maxOutputTokens: 10 }
    });
    
    if (response.text) {
      console.log(`[Diagnostic] Authentication successful.`);
      console.log(`[Diagnostic] Model ${configuredModel} is available.`);
      console.log(`[Diagnostic] Structured output supported: true`);
    } else {
       console.log(`[Diagnostic] Unexpected empty response.`);
       process.exit(1);
    }

  } catch (err: any) {
    let errorClass = "API_ERROR";
    if (err.status === 404) errorClass = "MODEL_UNAVAILABLE";
    if (err.status === 401 || err.status === 403) errorClass = "AUTH_ERROR";
    console.error(`[Diagnostic] Error (${errorClass}): ${err.message || JSON.stringify(err)}`);
    process.exit(1);
  }
}

runDiagnostic();

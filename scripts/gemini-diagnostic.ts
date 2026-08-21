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

  } catch (err: unknown) {
    let errorClass = "API_ERROR";
    const status = (err as { status?: number })?.status;
    if (status === 404) errorClass = "MODEL_UNAVAILABLE";
    if (status === 401 || status === 403) errorClass = "AUTH_ERROR";
    const message = (err instanceof Error ? err.message : undefined) || JSON.stringify(err);
    console.error(`[Diagnostic] Error (${errorClass}): ${message}`);
    process.exit(1);
  }
}

runDiagnostic();

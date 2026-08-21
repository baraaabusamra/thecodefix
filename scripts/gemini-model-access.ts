import { GoogleGenAI, Type } from "@google/genai";
import { config } from "dotenv";

async function run() {
  config({ path: ".env" });
  config({ path: ".env.local", override: true });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(JSON.stringify({ error: "No API Key" }));
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  const results: any[] = [];
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
       console.log(JSON.stringify({ error: `HTTP ${response.status} ${response.statusText}`, body: await response.text() }));
       return;
    }
    const data = await response.json();
    
    if (!data.models) {
        console.log(JSON.stringify({ error: "Failed to fetch models list", data }));
        return;
    }

    const models = data.models;
    const geminiModels = models
      .filter((m: any) => m.name.includes("gemini"));

    // We only test a few models to avoid rate limiting
    for (const m of geminiModels.slice(0, 8)) {
      const modelId = m.name.replace("models/", "");
      
      let generateSuccess = false;
      let errorMsg = null;
      let supportsStructuredOutput = false;

      if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
        try {
          const genRes = await ai.models.generateContent({
            model: modelId,
            contents: "Return JSON { \"ok\": true }",
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  ok: { type: Type.BOOLEAN }
                }
              }
            }
          });
          if (genRes.text) {
             generateSuccess = true;
             supportsStructuredOutput = true;
          }
        } catch (e: any) {
           errorMsg = e.message || JSON.stringify(e);
        }
      }

      results.push({
        modelName: modelId,
        supportedMethods: m.supportedGenerationMethods || [],
        generateSuccess,
        supportsStructuredOutput,
        error: errorMsg
      });
    }

    console.log(JSON.stringify({ results }, null, 2));

  } catch (e: any) {
    console.error(JSON.stringify({ error: e.message }));
  }
}

run();

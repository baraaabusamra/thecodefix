import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CurriculumExtractionProvider,
  ExtractionDocument,
  ExtractionResult,
  ProgramContext,
} from "./provider";
import { ExtractedCurriculumSchema } from "./schema";
import { buildExtractionPrompt } from "./prompt";

export class AnthropicCurriculumExtractor implements CurriculumExtractionProvider {
  private anthropic: Anthropic;
  private model: string;

  constructor() {
    // API Key must be set in environment variable ANTHROPIC_API_KEY
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    // Configurable model name
    this.model = process.env.CURRICULUM_EXTRACTION_MODEL || "claude-3-5-sonnet-20240620";
  }

  async extract(
    document: ExtractionDocument,
    context: ProgramContext,
    promptVersion: string
  ): Promise<ExtractionResult> {
    if (!document.extractedText) {
      return {
        data: null,
        rawJson: null,
        tokenUsage: null,
        error: "NO_TEXT_IN_DOCUMENT",
      };
    }

    const systemPrompt = buildExtractionPrompt(
      context.university,
      context.specialization,
      context.degree,
      document.extractedText
    );

    try {
      // Use Anthropic's tool use (JSON mode equivalent) to enforce the Zod schema
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 8192,
        temperature: 0, // Low randomness for deterministic extraction
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: "Please extract the curriculum information and return it as JSON.",
          },
        ],
        tools: [
          {
            name: "extract_curriculum",
            description: "Save the extracted curriculum structure.",
            input_schema: {
              type: "object",
              properties: {
                curriculum: {
                  type: "object",
                  properties: {
                    title: { type: ["string", "null"] },
                    degree: { type: ["string", "null"] },
                    specialization: { type: ["string", "null"] },
                    academicYear: { type: ["string", "null"] },
                    totalCredits: { type: ["number", "null"] },
                  },
                  required: ["title", "degree", "specialization", "academicYear", "totalCredits"],
                },
                courses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      code: { type: ["string", "null"] },
                      nameAr: { type: ["string", "null"] },
                      nameEn: { type: ["string", "null"] },
                      credits: { type: ["number", "null"] },
                      type: {
                        type: "string",
                        enum: [
                          "university_requirement",
                          "college_requirement",
                          "major_requirement",
                          "major_elective",
                          "free_elective",
                          "unknown",
                        ],
                      },
                      semester: { type: ["number", "null"] },
                      prerequisites: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            courseCode: { type: ["string", "null"] },
                            courseName: { type: ["string", "null"] },
                          },
                          required: ["courseCode", "courseName"],
                        },
                      },
                      evidence: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            page: { type: ["number", "null"] },
                            quote: { type: "string" },
                            field: { type: "string" },
                          },
                          required: ["page", "quote", "field"],
                        },
                      },
                    },
                    required: [
                      "code",
                      "nameAr",
                      "nameEn",
                      "credits",
                      "type",
                      "semester",
                      "prerequisites",
                      "evidence",
                    ],
                  },
                },
                document_limitations: { type: ["string", "null"] },
              },
              required: ["curriculum", "courses", "document_limitations"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "extract_curriculum" },
      });

      const tokenUsage = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      };

      // Find the tool use block
      const toolUseBlock = response.content.find((c) => c.type === "tool_use");

      if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
        return {
          data: null,
          rawJson: null,
          tokenUsage,
          error: "NO_TOOL_CALL_RETURNED",
        };
      }

      const rawJson = JSON.stringify(toolUseBlock.input);

      // Validate against strict Zod schema
      try {
        const validatedData = ExtractedCurriculumSchema.parse(toolUseBlock.input);
        return {
          data: validatedData,
          rawJson,
          tokenUsage,
          error: null,
        };
      } catch (zodError: unknown) {
        const message = zodError instanceof z.ZodError ? zodError.message : String(zodError);
        return {
          data: null,
          rawJson,
          tokenUsage,
          error: "SCHEMA_VALIDATION_FAILED: " + message,
        };
      }
    } catch (apiError: unknown) {
      const err = apiError as { status?: number; name?: string };
      let errorClass = "AI_API_ERROR";
      if (err.status === 429) errorClass = "AI_RATE_LIMIT";
      if (err.name === "TimeoutError") errorClass = "AI_TIMEOUT";

      return {
        data: null,
        rawJson: null,
        tokenUsage: null,
        error: errorClass,
      };
    }
  }
}

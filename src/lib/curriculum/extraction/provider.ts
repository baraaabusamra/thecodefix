import { ExtractedCurriculum } from "./schema";

export interface ExtractionDocument {
  id: string;
  sourceId: string;
  url: string;
  mimeType: string | null;
  contentHash: string | null;
  extractedText: string | null;
  pageCount: number | null;
}

export interface ProgramContext {
  country: string;
  university: string;
  specialization: string;
  degree: string;
}

export interface ExtractionResult {
  data: ExtractedCurriculum | null;
  rawJson: string | null;
  tokenUsage: {
    input: number;
    output: number;
  } | null;
  error: string | null;
}

export interface CurriculumExtractionProvider {
  extract(
    document: ExtractionDocument,
    context: ProgramContext,
    promptVersion: string
  ): Promise<ExtractionResult>;
}

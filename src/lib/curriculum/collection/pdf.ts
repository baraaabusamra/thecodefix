import { PDFParse } from "pdf-parse";

export interface PdfValidationResult {
  isValid: boolean;
  pageCount: number;
  extractedText: string;
  error?: string;
}

/**
 * Basic PDF validation to ensure the downloaded binary is a readable PDF
 * and to extract baseline metadata (page count, raw text).
 * Does NOT perform complex AI extraction.
 */
export async function validatePdf(buffer: Buffer): Promise<PdfValidationResult> {
  // Verify minimum reasonable file size (e.g. 100 bytes)
  if (buffer.length < 100) {
    return {
      isValid: false,
      pageCount: 0,
      extractedText: "",
      error: "INVALID_SIZE: File is too small to be a valid PDF",
    };
  }

  // Check basic signature first (%PDF-)
  if (buffer.toString("utf8", 0, 5) !== "%PDF-") {
    return {
      isValid: false,
      pageCount: 0,
      extractedText: "",
      error: "INVALID_SIGNATURE: File does not start with %PDF-",
    };
  }

  try {
    const parser = new PDFParse({ data: buffer });
    try {
      const info = await parser.getInfo();
      const result = await parser.getText({});
      
      // Some scanned PDFs return 0 text, but they are still valid PDFs
      return {
        isValid: true,
        pageCount: info.total || 0,
        extractedText: result.text || "", 
      };
    } finally {
      await parser.destroy();
    }
  } catch (error: any) {
    return {
      isValid: false,
      pageCount: 0,
      extractedText: "",
      error: error.message || "Failed to parse PDF content",
    };
  }
}

import { put } from "@vercel/blob";

/**
 * Stores a collected document in Vercel Blob with private access.
 * 
 * @param universityId The pipeline university ID
 * @param programId The pipeline program ID (null if general university document)
 * @param hash The content hash (SHA-256)
 * @param buffer The document content
 * @param contentType The MIME type (e.g., application/pdf or text/html)
 * @returns The Vercel Blob URL (private)
 */
export async function storeDocument(
  universityId: string, 
  programId: string | null, 
  hash: string, 
  buffer: Buffer, 
  contentType: string
): Promise<string> {
  const extension = contentType.includes("pdf") ? "pdf" : "html";
  const progPath = programId ?? "general";
  const path = `curriculum-documents/${universityId}/${progPath}/${hash}.${extension}`;

  // If BLOB_READ_WRITE_TOKEN is not configured, Vercel Blob will throw.
  // The system expects Vercel Blob to be configured for this to work.
  const { url } = await put(path, buffer, {
    access: "private", // Prevent public access to academic documents
    contentType: contentType,
  });

  return url;
}

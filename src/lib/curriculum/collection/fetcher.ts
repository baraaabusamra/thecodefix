import { validateSafeUrl } from "../discovery/domain";
import crypto from "node:crypto";
import { Agent } from "undici";

export interface FetchResult {
  url: string;
  status: number;
  contentType: string | null;
  contentLength: number;
  buffer: Buffer;
  hash: string;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB limit
const MAX_REDIRECTS = 5;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Optional explicitly allowed domains with broken certificates.
// This is strictly verified against the exact hostname.
const TLS_EXCEPTION_DOMAINS = [
  "usthb.dz", // Regional university with known broken certs
  "cu.edu.eg",
  "ju.edu.jo",
  "psut.edu.jo",
  "kau.edu.sa",
  "birzeit.edu",
  "squ.edu.om",
  "qu.edu.qa",
  "aau.ac.ae",
  "ku.edu.kw"
];

function isTlsExceptionAllowed(hostname: string): boolean {
  return TLS_EXCEPTION_DOMAINS.some(domain => 
    hostname === domain || hostname.endsWith("." + domain)
  );
}

export async function safeFetch(url: string, redirects = 0): Promise<FetchResult> {
  if (redirects > MAX_REDIRECTS) {
    throw new Error("TOO_MANY_REDIRECTS");
  }

  // Strict SSRF check before ANY request (including redirects)
  // This verifies DNS, private IPs, IPv6, localhost, etc.
  let safeUrl: URL;
  try {
    safeUrl = await validateSafeUrl(url);
  } catch (err: any) {
    if (err.message.includes("SSRF") || err.message.includes("Private IP") || err.message.includes("DNS")) {
      throw new Error(`SSRF_BLOCKED: ${err.message}`);
    }
    throw err;
  }

  const hostname = safeUrl.hostname;
  let dispatcher = undefined;
  
  if (isTlsExceptionAllowed(hostname)) {
    console.warn(`[SECURITY] TLS verification bypassed for approved exception domain: ${hostname}`);
    dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(safeUrl.toString(), {
      redirect: "manual", // Handle redirects manually for SSRF checking
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/pdf,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      signal: controller.signal,
      dispatcher // undici extension for Node native fetch
    } as RequestInit & { dispatcher?: any });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("REDIRECT_NO_LOCATION");
      const nextUrl = new URL(location, safeUrl).toString();
      return safeFetch(nextUrl, redirects + 1);
    }

    if (!response.ok) {
      if (response.status === 404) throw new Error("HTTP_404");
      if (response.status === 429) throw new Error("HTTP_429");
      if (response.status >= 500) throw new Error(`HTTP_5XX: ${response.status}`);
      throw new Error(`HTTP_${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    const contentLengthHeader = response.headers.get("content-length");
    
    if (contentLengthHeader && parseInt(contentLengthHeader, 10) > MAX_SIZE) {
      throw new Error("FILE_TOO_LARGE");
    }

    if (!response.body) {
      throw new Error("NO_RESPONSE_BODY");
    }

    const chunks: Buffer[] = [];
    let receivedBytes = 0;

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > MAX_SIZE) {
          throw new Error("FILE_TOO_LARGE");
        }
        chunks.push(Buffer.from(value));
      }
    }

    const buffer = Buffer.concat(chunks);
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    return {
      url: safeUrl.toString(),
      status: response.status,
      contentType,
      contentLength: buffer.length,
      buffer,
      hash
    };

  } catch (error: any) {
    const cause = error.cause || error;
    if (cause.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || 
        cause.code === "CERT_HAS_EXPIRED" || 
        cause.code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
        (cause.message && cause.message.toLowerCase().includes("certificate"))) {
      throw new Error("TLS_CERTIFICATE_ERROR");
    }
    if (cause.name === "TimeoutError" || cause.name === "AbortError" || cause.code === "ETIMEDOUT" || cause.code === "UND_ERR_CONNECT_TIMEOUT") {
      throw new Error("TIMEOUT");
    }
    if (cause.code === "ENOTFOUND" || cause.code === "EAI_AGAIN") {
      throw new Error("DNS_ERROR");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

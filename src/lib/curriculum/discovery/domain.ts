import dns from "node:dns/promises";
import { URL } from "node:url";
import * as net from "node:net";

export type DnsResolver = Pick<typeof dns, "resolve4" | "resolve6">;

/**
 * Validates if an IPv4 address is in a private, loopback, or reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  if (!net.isIPv4(ip)) return false;
  
  const parts = ip.split(".").map(Number);
  const [p1, p2] = parts;

  // 127.0.0.0/8 (Loopback)
  if (p1 === 127) return true;
  // 10.0.0.0/8 (Private)
  if (p1 === 10) return true;
  // 172.16.0.0/12 (Private)
  if (p1 === 172 && p2 >= 16 && p2 <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (p1 === 192 && p2 === 168) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata)
  if (p1 === 169 && p2 === 254) return true;
  // 0.0.0.0/8 (Current network)
  if (p1 === 0) return true;

  return false;
}

/**
 * Validates if an IPv6 address is in a private, loopback, or reserved range.
 */
function isPrivateIPv6(ip: string): boolean {
  if (!net.isIPv6(ip)) return false;
  
  const lower = ip.toLowerCase();
  
  // Loopback
  if (lower === "::1" || lower === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
  
  // Unspecified
  if (lower === "::" || lower === "0000:0000:0000:0000:0000:0000:0000:0000") return true;

  // fc00::/7 (Unique Local Addresses)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;

  // fe80::/10 (Link-local Addresses)
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;

  // IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (lower.startsWith("::ffff:")) {
    const ipv4Part = lower.split("::ffff:")[1];
    if (ipv4Part && net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  return false;
}

/**
 * Checks if a hostname resolves to any private or internal IP addresses.
 * Protects against DNS rebinding (partially, by checking at resolution time).
 * 
 * @param hostname The hostname to verify (e.g. "example.com")
 * @returns boolean True if safe (only public IPs), False if dangerous (resolves to internal IP or fails)
 */
export async function isSafeHostname(
  hostname: string,
  resolver: DnsResolver = dns
): Promise<boolean> {
  // Reject obvious localhosts
  const lowerHostname = hostname.toLowerCase();
  if (lowerHostname === "localhost" || lowerHostname.endsWith(".localhost") || lowerHostname === "local") {
    return false;
  }

  // If the hostname is already an IP, check it directly
  if (net.isIP(hostname)) {
    return net.isIPv4(hostname) ? !isPrivateIPv4(hostname) : !isPrivateIPv6(hostname);
  }

  try {
    // Resolve both A (IPv4) and AAAA (IPv6) records
    const [ipv4Records, ipv6Records] = await Promise.allSettled([
      resolver.resolve4(hostname),
      resolver.resolve6(hostname)
    ]);

    const ips: string[] = [];
    if (ipv4Records.status === "fulfilled") ips.push(...ipv4Records.value);
    if (ipv6Records.status === "fulfilled") ips.push(...ipv6Records.value);

    // If it doesn't resolve to anything, consider it unsafe (or unroutable)
    if (ips.length === 0) return false;

    // Check all resolved IPs. If ANY IP is private, reject the entire hostname.
    for (const ip of ips) {
      if (net.isIPv4(ip) && isPrivateIPv4(ip)) return false;
      if (net.isIPv6(ip) && isPrivateIPv6(ip)) return false;
    }

    return true;
  } catch {
    // DNS resolution failure (e.g., domain doesn't exist) -> unsafe
    return false;
  }
}

/**
 * Full SSRF validation for a URL string.
 * @param urlString The URL to test
 * @returns The parsed URL object if safe, throws an Error if unsafe.
 */
export async function validateSafeUrl(
  urlString: string,
  resolver: DnsResolver = dns
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`INVALID_URL: Failed to parse URL: ${urlString}`);
  }

  // Restrict to HTTP/HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`INVALID_PROTOCOL: Only http and https are allowed, got: ${parsed.protocol}`);
  }

  // Check for credentials in URL (e.g. http://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    throw new Error("CREDENTIALS_IN_URL: URLs with embedded credentials are not allowed.");
  }

  // Resolve and check IPs to prevent SSRF
  const isSafe = await isSafeHostname(parsed.hostname, resolver);
  if (!isSafe) {
    throw new Error(`SSRF_REJECTED: Hostname ${parsed.hostname} resolved to a private/internal IP or failed resolution.`);
  }

  return parsed;
}

/**
 * Validates whether a candidate domain is part of the official university domain.
 * 
 * @param officialDomain e.g., "ju.edu.jo"
 * @param candidateDomain e.g., "science.ju.edu.jo"
 */
export function isOfficialDomain(officialDomain: string | null | undefined, candidateDomain: string): boolean {
  if (!officialDomain) return false;

  const normalizedOfficial = officialDomain.trim().toLowerCase();
  const normalizedCandidate = candidateDomain.trim().toLowerCase();
  
  // Strip common subdomains from candidate for comparison if needed, 
  // but generally we just want to ensure it ends with the official domain.
  if (normalizedCandidate === normalizedOfficial) return true;

  // Match subdomains (e.g. faculty.example.edu ends with .example.edu)
  if (normalizedCandidate.endsWith(`.${normalizedOfficial}`)) return true;

  return false;
}

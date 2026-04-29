// SHA-256 hashing — δουλεύει σε browser (Web Crypto) και σε Node 18+ (globalThis.crypto).

export async function sha256(input) {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Παράγει το hash ενός block της αλυσίδας.
 * @param {{
 *   caseId: string,
 *   actionType: string,
 *   previousStatus: string|null,
 *   newStatus: string|null,
 *   riskScore: number|null,
 *   timestamp: string,
 *   previousHash: string|null,
 * }} opts
 */
export async function buildBlockHash(opts) {
  const payload = JSON.stringify({
    c: opts.caseId,
    a: opts.actionType,
    p: opts.previousStatus,
    n: opts.newStatus,
    r: opts.riskScore,
    t: opts.timestamp,
    h: opts.previousHash ?? "GENESIS",
  });
  return sha256(payload);
}
// SHA-256 hash for blockchain-inspired audit trail.
// Uses Web Crypto, available both in browser and on the edge runtime.
export async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildBlockHash(opts: {
  caseId: string;
  actionType: string;
  previousStatus: string | null;
  newStatus: string | null;
  riskScore: number | null;
  timestamp: string;
  previousHash: string | null;
}): Promise<string> {
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
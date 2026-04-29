import { buildBlockHash } from "./hash.js";
import { store } from "./store.js";

/**
 * Προσθέτει νέο block στην blockchain-inspired αλυσίδα.
 * Κάθε block έχει previousHash = hash του προηγούμενου block (ή null για GENESIS).
 */
export async function appendAuditBlock({
  caseId,
  actionType,
  previousStatus = null,
  newStatus = null,
  riskScore = null,
  actorRole = "system",
  metadata = {},
}) {
  const head = store.chainHead();
  const previousHash = head ? head.currentHash : null;
  const timestamp = new Date().toISOString();

  const currentHash = await buildBlockHash({
    caseId,
    actionType,
    previousStatus,
    newStatus,
    riskScore,
    timestamp,
    previousHash,
  });

  const block = {
    id: (store.listChain().length || 0) + 1,
    caseId,
    actionType,
    previousStatus,
    newStatus,
    riskScore,
    actorRole,
    metadata,
    timestamp,
    previousHash,
    currentHash,
  };

  store.appendBlock(block);
  return block;
}

/**
 * Επαληθεύει την ακεραιότητα όλης της αλυσίδας.
 * Επιστρέφει { valid, brokenAt }.
 */
export async function verifyChain(chain = store.listChain()) {
  let prevHash = null;
  for (const block of chain) {
    if (block.previousHash !== prevHash) {
      return { valid: false, brokenAt: block.id, reason: "previousHash mismatch" };
    }
    const expected = await buildBlockHash({
      caseId: block.caseId,
      actionType: block.actionType,
      previousStatus: block.previousStatus,
      newStatus: block.newStatus,
      riskScore: block.riskScore,
      timestamp: block.timestamp,
      previousHash: block.previousHash,
    });
    if (expected !== block.currentHash) {
      return { valid: false, brokenAt: block.id, reason: "currentHash tampered" };
    }
    prevHash = block.currentHash;
  }
  return { valid: true, length: chain.length };
}
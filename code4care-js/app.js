// Κοινό client glue που χρησιμοποιείται από όλα τα HTML pages.
import { computeRisk, SYMPTOMS } from "./lib/risk.js";
import { store, uuid } from "./lib/store.js";
import { appendAuditBlock, verifyChain } from "./lib/audit.js";

window.Code4Care = { computeRisk, SYMPTOMS, store, uuid, appendAuditBlock, verifyChain };

// Helper: format risk badge
window.riskBadge = (level) => {
  const map = {
    high: '<span class="badge badge-high">HIGH</span>',
    medium: '<span class="badge badge-medium">MEDIUM</span>',
    low: '<span class="badge badge-low">LOW</span>',
  };
  return map[level] || level;
};
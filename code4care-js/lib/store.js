// In-memory + localStorage store. Λειτουργεί ως mock βάση για το JS demo.

const KEY_CASES = "c4c_cases";
const KEY_CHAIN = "c4c_chain";

function read(key) {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function write(key, value) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const store = {
  // ---- cases ----
  listCases() {
    return read(KEY_CASES).sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      if (order[a.riskLevel] !== order[b.riskLevel]) {
        return order[a.riskLevel] - order[b.riskLevel];
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  },
  getCase(id) {
    return read(KEY_CASES).find((c) => c.id === id) || null;
  },
  saveCase(c) {
    const cases = read(KEY_CASES);
    const i = cases.findIndex((x) => x.id === c.id);
    if (i >= 0) cases[i] = c;
    else cases.push(c);
    write(KEY_CASES, cases);
  },

  // ---- audit chain ----
  listChain() {
    return read(KEY_CHAIN);
  },
  appendBlock(block) {
    const chain = read(KEY_CHAIN);
    chain.push(block);
    write(KEY_CHAIN, chain);
  },
  chainHead() {
    const chain = read(KEY_CHAIN);
    return chain.length ? chain[chain.length - 1] : null;
  },

  reset() {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(KEY_CASES);
    localStorage.removeItem(KEY_CHAIN);
  },
};

export function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
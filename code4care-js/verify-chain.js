#!/usr/bin/env node
// Επαληθεύει ένα chain dump (JSON array) από command line.
// Χρήση: node verify-chain.js [path-to-chain.json]

import { readFileSync } from "node:fs";
import { verifyChain } from "./lib/audit.js";

const path = process.argv[2] || new URL("./chain-dump.json", import.meta.url);
let chain;
try {
  chain = JSON.parse(readFileSync(path, "utf8"));
} catch (e) {
  console.error("❌ Δεν μπορώ να διαβάσω το chain από:", path.toString());
  console.error("   Εξήγαγε ένα chain-dump.json από τη σελίδα /admin (Export JSON).");
  process.exit(1);
}

const result = await verifyChain(chain);
if (result.valid) {
  console.log(`✅ Chain VALID — ${result.length} blocks`);
  process.exit(0);
} else {
  console.log(`❌ Chain BROKEN at block #${result.brokenAt}: ${result.reason}`);
  process.exit(2);
}
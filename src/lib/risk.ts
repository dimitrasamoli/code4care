export const SYMPTOMS = [
  { id: "chest_pain", label: "Chest pain", weight: 40 },
  { id: "fever", label: "High fever", weight: 25 },
  { id: "breathing", label: "Breathing difficulty", weight: 35 },
  { id: "dizziness", label: "Dizziness", weight: 15 },
  { id: "bleeding", label: "Severe bleeding", weight: 45 },
  { id: "headache", label: "Headache", weight: 10 },
  { id: "abdominal", label: "Abdominal pain", weight: 15 },
  { id: "severe_pain", label: "Severe pain", weight: 25 },
  { id: "other", label: "Other", weight: 5 },
] as const;

export type SymptomId = (typeof SYMPTOMS)[number]["id"];

export function calculateRiskScore(opts: {
  age: number;
  symptoms: string[];
  chronicCondition: boolean;
}): { score: number; level: "low" | "medium" | "high" } {
  let score = 0;
  if (opts.age > 65) score += 20;
  if (opts.age < 2) score += 15;
  for (const s of opts.symptoms) {
    const found = SYMPTOMS.find((x) => x.id === s);
    if (found) score += found.weight;
  }
  if (opts.chronicCondition) score += 15;
  score = Math.max(0, Math.min(100, score));
  const level = score <= 30 ? "low" : score <= 70 ? "medium" : "high";
  return { score, level };
}

export function estimateWaitMinutes(
  level: "low" | "medium" | "high",
  queuePosition: number,
): number {
  const base = level === "high" ? 5 : level === "medium" ? 20 : 45;
  return base + queuePosition * 8;
}

export function riskColorClass(level: "low" | "medium" | "high") {
  if (level === "high") return "bg-risk-high-bg text-risk-high border-risk-high/30";
  if (level === "medium") return "bg-risk-medium-bg text-risk-medium border-risk-medium/30";
  return "bg-risk-low-bg text-risk-low border-risk-low/30";
}

export function riskLabel(level: "low" | "medium" | "high") {
  return level === "high" ? "High risk" : level === "medium" ? "Medium risk" : "Low risk";
}

// --- Heraklion on-call hospital ---
// Live data via the `oncall-hospital` edge function (scrapes 7th Health Region of Crete).
// Falls back to daily rotation if the live source is unreachable.
export const HERAKLION_HOSPITALS = [
  "ΠΑΓΝΗ — Πανεπιστημιακό Γενικό Νοσοκομείο Ηρακλείου",
  "Βενιζέλειο Γενικό Νοσοκομείο Ηρακλείου",
] as const;

function fallbackHospital(date: Date = new Date()): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  const day = Math.floor(diff / 86_400_000);
  return HERAKLION_HOSPITALS[day % HERAKLION_HOSPITALS.length];
}

let _cache: { hospital: string; at: number } | null = null;

export async function fetchOnCallHospital(): Promise<string> {
  // 10-minute client-side cache
  if (_cache && Date.now() - _cache.at < 600_000) return _cache.hospital;
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oncall-hospital`;
    const res = await fetch(url, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "" },
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { hospital?: string };
    const hospital = json.hospital || fallbackHospital();
    _cache = { hospital, at: Date.now() };
    return hospital;
  } catch {
    return fallbackHospital();
  }
}

// Sync default for SSR/initial render — the live value replaces it on mount.
export function getOnCallHospital(date: Date = new Date()): string {
  return fallbackHospital(date);
}

// --- Greek ambulance plate generator: 3 uppercase Greek letters + 4 digits, e.g. ΕΚΑ-1234 ---
const GREEK_PLATE_LETTERS = "ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ"; // letters that exist in both alphabets
export function generateGreekPlate(): string {
  let letters = "";
  for (let i = 0; i < 3; i++) {
    letters += GREEK_PLATE_LETTERS[Math.floor(Math.random() * GREEK_PLATE_LETTERS.length)];
  }
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${letters}-${digits}`;
}
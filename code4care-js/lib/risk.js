// Risk scoring engine — ίδια λογική με το TS app.

const SYMPTOM_WEIGHTS = {
  chest_pain: 40,
  breathing: 35,
  unconscious: 50,
  severe_bleeding: 45,
  stroke_signs: 50,
  high_fever: 20,
  vomiting: 10,
  abdominal_pain: 15,
  headache: 10,
  injury: 15,
  other: 5,
};

export const SYMPTOMS = Object.keys(SYMPTOM_WEIGHTS);

/**
 * @param {{ age:number, symptoms:string[], chronicCondition:boolean }} input
 * @returns {{ score:number, level:'low'|'medium'|'high', estimatedWaitMinutes:number }}
 */
export function computeRisk(input) {
  let score = 0;

  for (const s of input.symptoms) {
    score += SYMPTOM_WEIGHTS[s] ?? 0;
  }

  if (input.age >= 65) score += 20;
  else if (input.age <= 5) score += 25;

  if (input.chronicCondition) score += 15;

  score = Math.min(score, 100);

  let level = "low";
  if (score >= 60) level = "high";
  else if (score >= 30) level = "medium";

  const estimatedWaitMinutes =
    level === "high" ? 5 : level === "medium" ? 25 : 60;

  return { score, level, estimatedWaitMinutes };
}
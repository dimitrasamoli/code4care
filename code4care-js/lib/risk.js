export function computeRisk(input) {
  const symptoms = new Set(input.symptoms);

  // LEVEL 1 — critical
  const critical = [
    "unconscious",
    "stroke_signs",
    "severe_bleeding",
    "breathing",
    "chest_pain",
  ];

  if (critical.some(s => symptoms.has(s))) {
    return {
      score: 95,
      level: "high",
      estimatedWaitMinutes: 5,
    };
  }

  // LEVEL 2 — urgent
  const urgent = [
    "high_fever",
    "abdominal_pain",
    "injury",
    "vomiting",
    "headache",
  ];

  if (
    urgent.some(s => symptoms.has(s)) ||
    input.age >= 65 ||
    input.age <= 5 ||
    input.chronicCondition
  ) {
    return {
      score: 60,
      level: "medium",
      estimatedWaitMinutes: 25,
    };
  }

  // LEVEL 3 — stable
  return {
    score: 20,
    level: "low",
    estimatedWaitMinutes: 60,
  };
}
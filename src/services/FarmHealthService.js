// src/services/FarmHealthService.js
// Combines multiple signals into a single Farm Health score and label.

export function computeFarmHealth(inputs) {
  const {
    diseaseRiskPct = 10, // lower is better
    sensorUptimePct = 95,
    envSuitabilityPct = 80,
    irrigationBalancePct = 75,
    alertLoadPct = 5 // lower is better
  } = inputs || {};

  const score = (
    0.35 * (100 - clamp(diseaseRiskPct, 0, 100)) +
    0.25 * clamp(sensorUptimePct, 0, 100) +
    0.20 * clamp(envSuitabilityPct, 0, 100) +
    0.10 * clamp(irrigationBalancePct, 0, 100) +
    0.10 * (100 - clamp(alertLoadPct, 0, 100))
  );

  const rounded = Math.round(score);
  return { score: rounded, label: scoreLabel(rounded) };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value ?? 0)));
}

function scoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  return 'Poor';
}



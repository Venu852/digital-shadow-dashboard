/* The five phone signals, status colours and status/band helpers.
   Labels and cause texts returned by the server win; these are the fallbacks. */

export const SIGNAL_DEFS = [
  {
    key: "switching", label: "App switching", short: "Switching",
    cause: "Switching between apps is more frequent than baseline.",
    action: "Reduce open workload and consolidate tasks into one view.",
  },
  {
    key: "session", label: "Session length", short: "Session",
    cause: "Time in a single app is shorter than baseline.",
    action: "Adjust pacing and shorten the next module.",
  },
  {
    key: "checks", label: "Phone checks", short: "Checks",
    cause: "Phone pick-ups are more frequent than baseline.",
    action: "Insert a short break prompt and lighten the task queue.",
  },
  {
    key: "screen", label: "Screen time", short: "Screen",
    cause: "Screen-on time is above baseline for this time of day.",
    action: "Plan shorter focus blocks with a short break between them.",
  },
  {
    key: "steadiness", label: "Motion steadiness", short: "Steadiness",
    cause: "Phone handling is less steady than baseline.",
    action: "Lower task difficulty and surface guided hints.",
  },
];

export const SIGNALS_BY_KEY = Object.fromEntries(SIGNAL_DEFS.map((s) => [s.key, s]));

// Radar baseline: the level a signal sits at when behaviour matches the person's own normal
export const LEVEL_BASELINE = 12;
export const DRIFT_REFERENCE = 45;

export const BAND_COLORS = {
  stable: "#6366F1",
  early: "#818CF8",
  elevated: "#F59E0B",
  high: "#FB923C",
};

export function statusFor(score) {
  if (score < 20) return { label: "Stable", band: "stable", color: BAND_COLORS.stable };
  if (score < 45) return { label: "Early drift", band: "early", color: BAND_COLORS.early };
  if (score < 70) return { label: "Elevated drift", band: "elevated", color: BAND_COLORS.elevated };
  return { label: "High drift", band: "high", color: BAND_COLORS.high };
}

// Adds the colour to a server status ({label, band}); null stays null
export function withColor(status) {
  if (!status) return null;
  return { ...status, color: BAND_COLORS[status.band] || BAND_COLORS.stable };
}

export function radarData(levels) {
  return SIGNAL_DEFS.map((s) => ({
    signal: s.short,
    current: levels ? levels[s.key] : 0,
    baseline: LEVEL_BASELINE,
  }));
}

// Same shape as the server's factor breakdown, for team averages that have no server text
export function levelBreakdown(levels) {
  const total = SIGNAL_DEFS.reduce((sum, s) => sum + levels[s.key], 0);
  return SIGNAL_DEFS
    .map((s) => ({
      key: s.key,
      label: s.label,
      level: levels[s.key],
      pct: total ? Math.floor((levels[s.key] / total) * 100 + 0.5) : 0,
      cause: s.cause,
    }))
    .sort((a, b) => b.level - a.level);
}

export const shortDay = (day) => (day ? day.slice(5) : "");

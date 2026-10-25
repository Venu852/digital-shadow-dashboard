/* The six phone signals, status colours and status/band helpers.
   Labels and cause texts returned by the server win; these are the fallbacks.
   `cause` and `action` are the coordinator's view; `self` and `personal` are the person's. */

export const SIGNAL_DEFS = [
  {
    key: "switching", label: "App switching", short: "Switching",
    cause: "App switching is above the group's baseline.",
    action: "Reduce parallel tasks so people can stay with one thing longer.",
    self: "You are switching between apps more often than your usual.",
    personal: "Try checking messages at set times instead of switching all day.",
  },
  {
    key: "session", label: "Session length", short: "Session",
    cause: "Time in a single app is shorter than baseline.",
    action: "Protect longer uninterrupted blocks; cut interruptions and hand-offs.",
    self: "Your time in a single app is shorter than usual.",
    personal: "Try one longer, uninterrupted block today, even 25 minutes.",
  },
  {
    key: "checks", label: "Phone checks", short: "Checks",
    cause: "Phone pick-ups are more frequent than baseline.",
    action: "Batch non-urgent updates and pings into set times.",
    self: "You are picking up the phone more often than your baseline.",
    personal: "Try leaving the phone out of reach for one hour.",
  },
  {
    key: "screen", label: "Screen time", short: "Screen",
    cause: "Screen-on time is above baseline.",
    action: "Avoid long back-to-back screen sessions; encourage short breaks.",
    self: "Your screen-on time is above your usual.",
    personal: "Try a short screen-free break between long stretches.",
  },
  {
    key: "night", label: "Late-night use", short: "Late night",
    cause: "Late-night phone use is above baseline.",
    action: "Avoid late-evening requests and deadlines; keep after-hours messages to a minimum.",
    self: "You are using the phone more between midnight and 5am than usual.",
    personal: "Try putting the phone away 30 minutes earlier tonight.",
  },
  {
    key: "timing", label: "Routine timing", short: "Timing",
    cause: "Daily start and end times are shifting from baseline.",
    action: "Keep meeting and deadline times steady; avoid sudden schedule changes.",
    self: "Your phone day is starting or ending at different times than usual.",
    personal: "Try keeping your first and last phone use of the day closer to your usual times.",
  },
];

export const SIGNALS_BY_KEY = Object.fromEntries(SIGNAL_DEFS.map((s) => [s.key, s]));

// Radar baseline: the level a signal sits at when phone use matches the person's own normal
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

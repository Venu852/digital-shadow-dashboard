import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ReferenceLine, BarChart, Bar
} from "recharts";
import {
  Activity, Shield, Zap, Users, Clock, ChevronRight, EyeOff,
  SlidersHorizontal, Check, X, Trash2, Info, Layers
} from "lucide-react";

/* ---------------- data model ---------------- */

const SIGNAL_DEFS = [
  { key: "scroll", label: "Scroll variance", short: "Scroll" },
  { key: "pause", label: "Pause duration", short: "Pause" },
  { key: "typing", label: "Typing rhythm", short: "Typing" },
  { key: "sessionLen", label: "Session length drop", short: "Session" },
  { key: "appSwitch", label: "App switching", short: "Switching" },
];

const CAUSES = {
  scroll: "Scrolling speed has become less consistent than this user's baseline.",
  pause: "Pauses before actions are running longer than usual.",
  typing: "Typing rhythm shows more hesitation than the baseline pattern.",
  sessionLen: "Sessions are ending earlier than the established baseline.",
  appSwitch: "Switching between apps is more frequent than baseline.",
};

const RESPONSES = {
  scroll: "Simplify layout and reduce visual density on the next session.",
  pause: "Insert a short break prompt and lighten the task queue.",
  typing: "Lower task difficulty and surface guided hints.",
  sessionLen: "Adjust pacing and shorten the next module.",
  appSwitch: "Reduce open workload and consolidate tasks into one view.",
};

const CONTEXT_TAGS = ["None", "Exam week", "Deadline crunch", "Product launch", "Holiday or break"];

const wave = (base, amp, i, noise = 4) =>
  Math.max(2, Math.min(96, Math.round(base + amp * Math.sin(i * 0.7) + (Math.random() - 0.5) * noise)));

function buildHistory(pattern, n = 10) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    let level;
    if (pattern === "stable") level = 10 + Math.sin(i * 0.8) * 4;
    if (pattern === "drifting") level = 8 + i * 6.2;
    if (pattern === "mild") level = 14 + i * 2.4;
    if (pattern === "recovering") level = 68 - i * 5.4;
    rows.push({
      session: i + 1,
      scroll: wave(level, 6, i),
      pause: wave(level, 8, i + 1),
      typing: wave(level, 5, i + 2),
      sessionLen: wave(level, 7, i + 3),
      appSwitch: wave(level, 6, i + 4),
    });
  }
  return rows.map((r) => ({
    ...r,
    drift: Math.round((r.scroll + r.pause + r.typing + r.sessionLen + r.appSwitch) / 5),
  }));
}

const TEAMS = [
  { id: "nova", name: "Team Nova" },
  { id: "atlas", name: "Team Atlas" },
];

const USERS = [
  { id: "aditi", name: "Aditi R.", context: "Undergraduate learner", pattern: "stable", team: "nova" },
  { id: "rohan", name: "Rohan K.", context: "Junior analyst, 3rd week", pattern: "drifting", team: "nova" },
  { id: "zara", name: "Zara N.", context: "Support engineer", pattern: "mild", team: "nova" },
  { id: "meera", name: "Meera S.", context: "Support engineer, post-intervention", pattern: "recovering", team: "atlas" },
  { id: "kabir", name: "Kabir T.", context: "Product designer", pattern: "stable", team: "atlas" },
  { id: "ishaan", name: "Ishaan V.", context: "QA engineer", pattern: "stable", team: "atlas" },
];

const SENSITIVITY_MULT = { low: 0.7, medium: 1, high: 1.3 };

function statusFor(score) {
  if (score < 20) return { label: "Stable", color: "#6366F1" };
  if (score < 45) return { label: "Early drift", color: "#818CF8" };
  if (score < 70) return { label: "Elevated drift", color: "#F59E0B" };
  return { label: "High drift", color: "#FB923C" };
}

function dominantSignal(latest) {
  let key = SIGNAL_DEFS[0].key, val = -1;
  SIGNAL_DEFS.forEach((s) => { if (latest[s.key] > val) { val = latest[s.key]; key = s.key; } });
  return SIGNAL_DEFS.find((s) => s.key === key);
}

const LAYERS = [
  { n: "01", title: "Interaction capture", desc: "Collects scroll speed, pause duration, typing cadence, app-switch frequency and session timing. Never content, voice, face or biometric data." },
  { n: "02", title: "Behavior abstraction", desc: "Converts raw events into features like scroll entropy and pause-action ratio. Looks at trends across time, not single actions." },
  { n: "03", title: "Personal baseline engine", desc: "Learns each user's own normal rhythm during a silent calibration window. Compares a person only against their past self." },
  { n: "04", title: "Drift and deviation analyzer", desc: "Detects directional change, not sudden anomalies. Reports that behavior is shifting, never that a person is burned out." },
  { n: "05", title: "Future-state prediction engine", desc: "Estimates where behavior is heading, with a probability and a time horizon, before performance visibly drops." },
  { n: "06", title: "Response and adaptation layer", desc: "Adjusts pacing, difficulty and workload quietly. No alerts, no labels, no 'you are at risk' messages." },
];

const TABS_MANAGER = [
  { id: "overview", label: "Overview" },
  { id: "explain", label: "Explainability" },
  { id: "context", label: "Context" },
  { id: "team", label: "Team view" },
  { id: "privacy", label: "Privacy & ethics" },
  { id: "architecture", label: "Architecture" },
];
const TABS_INDIVIDUAL = [
  { id: "overview", label: "My trends" },
  { id: "explain", label: "Why this reading" },
  { id: "privacy", label: "My privacy" },
];

/* ---------------- small UI helpers ---------------- */

function Card({ children, className = "" }) {
  return <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>{children}</div>;
}
function SectionHead({ title, sub }) {
  return (
    <div className="mb-4">
      <div className="text-sm font-medium">{title}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 rounded-full relative transition ${checked ? "bg-indigo-500" : "bg-slate-700"}`}
        style={{ height: 22 }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition"
          style={{ left: checked ? 20 : 2 }}
        />
      </button>
    </label>
  );
}

/* ---------------- app ---------------- */

export default function App() {
  const [role, setRole] = useState("manager");
  const [userId, setUserId] = useState("rohan");
  const [tab, setTab] = useState("overview");
  const [historyMap, setHistoryMap] = useState(() => {
    const m = {};
    USERS.forEach((u) => { m[u.id] = buildHistory(u.pattern); });
    return m;
  });
  const [sliders, setSliders] = useState({ scroll: 20, pause: 20, typing: 20, sessionLen: 20, appSwitch: 20 });
  const [settingsMap, setSettingsMap] = useState(() => {
    const m = {};
    USERS.forEach((u) => {
      m[u.id] = { tracking: true, sensitivity: "medium", context: "None", humanReview: true, visibleToUser: true, retentionDays: 30 };
    });
    return m;
  });
  const [approvals, setApprovals] = useState({});

  const tabs = role === "individual" ? TABS_INDIVIDUAL : TABS_MANAGER;
  const user = USERS.find((u) => u.id === userId);
  const settings = settingsMap[userId];
  const history = historyMap[userId];
  const tracking = settings.tracking;

  const rawLatest = history.length ? history[history.length - 1] : null;
  const mult = SENSITIVITY_MULT[settings.sensitivity];
  const contextDamp = settings.context !== "None" ? 15 : 0;
  const displayedScore = rawLatest
    ? Math.max(0, Math.min(100, Math.round(rawLatest.drift * mult) - contextDamp))
    : 0;
  const status = statusFor(displayedScore);
  const baselineEstablished = history.length >= 5;

  const confidence = Math.min(95, 40 + history.length * 4);
  const slope = history.length >= 4
    ? history[history.length - 1].drift - history[history.length - 4].drift
    : 0;
  const horizon = slope > 8 ? "2 to 3 weeks if the trend continues"
    : slope > 2 ? "4 to 6 weeks if the trend continues"
    : "No defined horizon — trend is stable or improving";

  const factorBreakdown = useMemo(() => {
    if (!rawLatest) return [];
    const total = SIGNAL_DEFS.reduce((s, d) => s + rawLatest[d.key], 0) || 1;
    return SIGNAL_DEFS
      .map((d) => ({ ...d, value: rawLatest[d.key], pct: Math.round((rawLatest[d.key] / total) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [rawLatest]);

  const events = useMemo(() => {
    const list = [];
    history.forEach((row) => {
      if (row.drift >= 45) {
        const d = dominantSignal(row);
        list.push({ id: `${userId}-${row.session}`, session: row.session, drift: row.drift, action: RESPONSES[d.key], signal: d.label });
      }
    });
    return list.slice(-4).reverse();
  }, [history, userId]);

  const radarData = SIGNAL_DEFS.map((s) => ({
    signal: s.short,
    current: rawLatest ? rawLatest[s.key] : 0,
    baseline: 12,
  }));

  const teamData = TEAMS.map((t) => {
    const members = USERS.filter((u) => u.team === t.id);
    const avg = Math.round(
      members.reduce((sum, m) => {
        const h = historyMap[m.id];
        const last = h[h.length - 1];
        return sum + (last ? last.drift : 0);
      }, 0) / members.length
    );
    return { team: t.name, drift: avg, size: members.length };
  });

  function updateSetting(key, value) {
    setSettingsMap((prev) => ({ ...prev, [userId]: { ...prev[userId], [key]: value } }));
  }
  function logSession() {
    setHistoryMap((prev) => {
      const prevHistory = prev[userId];
      const row = { session: prevHistory.length + 1, ...sliders };
      row.drift = Math.round((row.scroll + row.pause + row.typing + row.sessionLen + row.appSwitch) / 5);
      return { ...prev, [userId]: [...prevHistory, row] };
    });
  }
  function deleteHistory() {
    setHistoryMap((prev) => ({ ...prev, [userId]: [] }));
  }
  function decideEvent(id, decision) {
    setApprovals((prev) => ({ ...prev, [id]: decision }));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div>
            <span className="font-semibold tracking-tight text-lg">Digital Shadow</span>
            <span className="text-slate-500 text-sm ml-1 hidden sm:inline">/ behavioral forecasting console</span>
          </div>
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => { setRole("manager"); setTab("overview"); }}
              className={`px-3 py-1.5 rounded-md ${role === "manager" ? "bg-indigo-500 text-slate-950 font-medium" : "text-slate-400"}`}
            >
              Manager view
            </button>
            <button
              onClick={() => { setRole("individual"); setTab("overview"); }}
              className={`px-3 py-1.5 rounded-md ${role === "individual" ? "bg-indigo-500 text-slate-950 font-medium" : "text-slate-400"}`}
            >
              Individual view
            </button>
          </div>
        </div>

        {/* user selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => setUserId(u.id)}
              className={`px-4 py-2.5 rounded-lg border text-left transition ${
                u.id === userId ? "border-indigo-500 bg-indigo-950" : "border-slate-800 bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="text-sm font-medium">{u.name}</div>
              <div className="text-xs text-slate-500">{u.context}</div>
            </button>
          ))}
        </div>

        {/* tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-800 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${
                tab === t.id ? "border-indigo-400 text-slate-100" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!tracking && (
          <Card className="mb-6 flex items-center gap-3">
            <EyeOff size={16} className="text-slate-500" />
            <div className="text-sm text-slate-400">
              Tracking is paused for {user.name}. Turn it back on from Privacy &amp; ethics to resume observation.
            </div>
          </Card>
        )}

        {/* ---------------- OVERVIEW ---------------- */}
        {tab === "overview" && tracking && (
          <>
            {!rawLatest ? (
              <Card><div className="text-sm text-slate-400 py-6 text-center">No sessions yet — log one below to begin baseline calibration.</div></Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-3"><Activity size={14} /> Drift score</div>
                    <div className="text-3xl font-semibold" style={{ color: status.color }}>{displayedScore}</div>
                    <div className="text-xs mt-1" style={{ color: status.color }}>{status.label}</div>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-3"><Zap size={14} /> Prediction confidence</div>
                    <div className="text-3xl font-semibold">{confidence}%</div>
                    <div className="text-xs text-slate-500 mt-1">based on {history.length} sessions observed</div>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-3"><Clock size={14} /> Disengagement horizon</div>
                    <div className="text-sm font-medium leading-snug">{horizon}</div>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-3"><Shield size={14} /> Baseline</div>
                    <div className="text-lg font-medium">{baselineEstablished ? "Established" : "Calibrating"}</div>
                    <div className="text-xs text-slate-500 mt-1">{baselineEstablished ? "Personalized to this user" : `${5 - history.length} sessions to go`}</div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <SectionHead title="Drift trend" sub="Deviation from personal baseline, by session" />
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="session" stroke="#475569" fontSize={11} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={11} tickLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 8, fontSize: 12 }} />
                        <ReferenceLine y={45} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Line type="monotone" dataKey="drift" stroke="#818CF8" strokeWidth={2.5} dot={{ r: 3, fill: "#818CF8" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                  <Card>
                    <SectionHead title="Latest session vs baseline" sub="Five tracked interaction signals" />
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData} outerRadius={75}>
                        <PolarGrid stroke="#1E293B" />
                        <PolarAngleAxis dataKey="signal" stroke="#64748B" fontSize={11} />
                        <Radar name="Baseline" dataKey="baseline" stroke="#475569" fill="#475569" fillOpacity={0.25} />
                        <Radar name="Current" dataKey="current" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <Card>
                <SectionHead title="Log a new session" sub="Describe this session's deviation from baseline, then log it" />
                <div className="space-y-4">
                  {SIGNAL_DEFS.map((s) => (
                    <div key={s.key}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-300">{s.label}</span>
                        <span className="text-indigo-400 font-mono">{sliders[s.key]}</span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={sliders[s.key]}
                        onChange={(e) => setSliders((p) => ({ ...p, [s.key]: parseInt(e.target.value, 10) }))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={logSession}
                  className="mt-5 w-full bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-medium text-sm rounded-lg py-2.5 transition flex items-center justify-center gap-1.5"
                >
                  Log this session <ChevronRight size={15} />
                </button>
              </Card>

              <Card>
                <SectionHead title="Adaptive response timeline" sub={settings.humanReview ? "Suggested actions await manager approval" : "Actions applied automatically"} />
                {events.length === 0 && <div className="text-sm text-slate-500 py-6 text-center">No intervention triggered yet.</div>}
                <div className="space-y-3">
                  {events.map((e) => {
                    const decision = approvals[e.id];
                    return (
                      <div key={e.id} className="border-l-2 border-amber-500 pl-3 py-1">
                        <div className="text-xs text-slate-500 font-mono mb-0.5">Session {e.session} · drift {e.drift}</div>
                        <div className="text-sm text-slate-200">{e.action}</div>
                        <div className="text-xs text-slate-500 mt-0.5 mb-1.5">Triggered by {e.signal.toLowerCase()}</div>
                        {settings.humanReview ? (
                          decision ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${decision === "approved" ? "bg-indigo-950 text-indigo-300" : "bg-slate-800 text-slate-400"}`}>
                              {decision === "approved" ? "Approved" : "Dismissed"}
                            </span>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => decideEvent(e.id, "approved")} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md"><Check size={12} /> Approve</button>
                              <button onClick={() => decideEvent(e.id, "dismissed")} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md"><X size={12} /> Dismiss</button>
                            </div>
                          )
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300">Applied automatically</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ---------------- EXPLAINABILITY ---------------- */}
        {tab === "explain" && (
          <Card>
            <SectionHead title="Why this reading" sub="Cause and effect, in plain language — no technical jargon" />
            {!rawLatest ? (
              <div className="text-sm text-slate-400 py-6 text-center">No sessions logged yet for this user.</div>
            ) : (
              <div className="space-y-4">
                {factorBreakdown.map((f) => (
                  <div key={f.key} className="flex items-start gap-4">
                    <div className="w-14 text-right font-mono text-sm text-indigo-400 pt-0.5">{f.pct}%</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-200">{f.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{CAUSES[f.key]}</div>
                    </div>
                  </div>
                ))}
                <div className="border-t border-slate-800 pt-4 mt-4 text-xs text-slate-500 flex items-start gap-2">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  This layer reports that behavior is changing direction — it never states a diagnosis, a mental-health condition, or a performance judgment.
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ---------------- CONTEXT (manager only) ---------------- */}
        {tab === "context" && role === "manager" && (
          <Card>
            <SectionHead title="Context awareness" sub="Tag known circumstances so the baseline isn't misread as drift" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
              {CONTEXT_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => updateSetting("context", tag)}
                  className={`px-3 py-2.5 rounded-lg border text-sm text-left ${
                    settings.context === tag ? "border-indigo-500 bg-indigo-950" : "border-slate-800 bg-slate-950 hover:border-slate-700"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {settings.context !== "None" ? (
              <div className="text-sm text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-4">
                Context <span className="text-indigo-400 font-medium">{settings.context}</span> is active for {user.name}.
                Raw drift for the latest session was <span className="font-mono">{rawLatest ? rawLatest.drift : "—"}</span>,
                displayed as <span className="font-mono">{displayedScore}</span> after context adjustment, to avoid a false alarm.
              </div>
            ) : (
              <div className="text-sm text-slate-500">No context tag active — readings reflect raw behavioral drift.</div>
            )}
          </Card>
        )}

        {/* ---------------- TEAM (manager only) ---------------- */}
        {tab === "team" && role === "manager" && (
          <Card>
            <SectionHead title="Team-level aggregate" sub="Group trends only — no individual is singled out in this view" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={teamData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="team" stroke="#475569" fontSize={12} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="drift" fill="#818CF8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-xs text-slate-500 flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0" />
              Aggregate scores average every member's latest drift reading. No name, role, or individual score is exposed here — this view exists for workflow and workload decisions, not performance review.
            </div>
          </Card>
        )}

        {/* ---------------- PRIVACY & ETHICS ---------------- */}
        {tab === "privacy" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionHead title={role === "individual" ? "My controls" : `Controls for ${user.name}`} />
              <Toggle checked={settings.tracking} onChange={(v) => updateSetting("tracking", v)} label="Behavioral tracking enabled" />
              {role === "manager" && (
                <Toggle checked={settings.humanReview} onChange={(v) => updateSetting("humanReview", v)} label="Require human approval before actions apply" />
              )}
              <Toggle checked={settings.visibleToUser} onChange={(v) => updateSetting("visibleToUser", v)} label="Show trend visibility to this user" />
              <div className="mt-4">
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5"><SlidersHorizontal size={12} /> Sensitivity</div>
                <div className="flex gap-2">
                  {["low", "medium", "high"].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateSetting("sensitivity", s)}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm capitalize ${
                        settings.sensitivity === s ? "border-indigo-500 bg-indigo-950" : "border-slate-800 bg-slate-950 hover:border-slate-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-500 mb-2">Data retention: {settings.retentionDays} days</div>
                <input
                  type="range" min="7" max="90" value={settings.retentionDays}
                  onChange={(e) => updateSetting("retentionDays", parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 mb-4"
                />
                <button
                  onClick={deleteHistory}
                  className="w-full flex items-center justify-center gap-2 text-sm border border-red-900 text-red-400 hover:bg-red-950 rounded-lg py-2.5 transition"
                >
                  <Trash2 size={14} /> Delete history and restart baseline
                </button>
              </div>
            </Card>
            <Card>
              <SectionHead title="Ethical guarantees" sub="These principles are embedded across every layer, not written as policy alone" />
              <ul className="space-y-2.5 text-sm text-slate-300">
                <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> No identity inference — the system reasons about patterns, not people.</li>
                <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> No mental-health claims or diagnostic language, ever.</li>
                <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> No individual punishment mechanisms — insights inform systems, not grading or firing.</li>
                <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> No biometric, voice, facial, or content data is ever collected.</li>
                <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> Tracking can be paused per person at any time, with no penalty.</li>
              </ul>
            </Card>
          </div>
        )}

        {/* ---------------- ARCHITECTURE (manager only) ---------------- */}
        {tab === "architecture" && role === "manager" && (
          <Card>
            <SectionHead title="Six-layer architecture" sub="Each layer is intentionally separated to limit ethical, legal, and technical risk" />
            <div className="space-y-4">
              {LAYERS.map((l) => (
                <div key={l.n} className="flex gap-4 border-b border-slate-800 pb-4 last:border-0 last:pb-0">
                  <div className="font-mono text-xs text-slate-600 pt-0.5 w-6 shrink-0">{l.n}</div>
                  <div>
                    <div className="text-sm font-medium text-slate-200 flex items-center gap-1.5"><Layers size={13} className="text-indigo-400" /> {l.title}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{l.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* footer */}
        <div className="flex items-center gap-2 text-xs text-slate-600 border-t border-slate-900 pt-5 mt-6">
          <Users size={13} />
          No biometric, emotional, or personal content is collected — only interaction rhythm, compared against each person's own baseline.
        </div>
      </div>
    </div>
  );
}

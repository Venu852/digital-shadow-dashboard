import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ReferenceLine, BarChart, Bar
} from "recharts";
import {
  Activity, Shield, Zap, Clock, ChevronRight, EyeOff,
  SlidersHorizontal, Check, X, Trash2, Info, PlayCircle, PauseCircle, ArrowLeft
} from "lucide-react";
import { Card, SectionHead, Toggle, Footer, ArchitectureCard, TOOLTIP_STYLE } from "./ui.jsx";
import { SIGNAL_DEFS, statusFor } from "./signals.js";

/* Simulated dashboard: everything here lives in memory and never touches the server. */

/* ---------------- data model ---------------- */

const CAUSES = Object.fromEntries(SIGNAL_DEFS.map((s) => [s.key, s.cause]));
const RESPONSES = Object.fromEntries(SIGNAL_DEFS.map((s) => [s.key, s.action]));

const CONTEXT_TAGS = ["None", "Exam week", "Travel", "Holiday or break", "Busy period", "New routine"];

// Drift is the rounded mean of the six signal levels
const meanDrift = (row) => Math.round(SIGNAL_DEFS.reduce((sum, s) => sum + row[s.key], 0) / SIGNAL_DEFS.length);

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
      sessionNo: i + 1,
      switching: wave(level, 6, i),
      session: wave(level, 8, i + 1),
      checks: wave(level, 5, i + 2),
      screen: wave(level, 7, i + 3),
      night: wave(level, 6, i + 4),
      timing: wave(level, 5, i + 5),
    });
  }
  return rows.map((r) => ({ ...r, drift: meanDrift(r) }));
}

const TEAMS = [
  { id: "nova", name: "Team Nova" },
  { id: "atlas", name: "Team Atlas" },
];

const USERS = [
  { id: "aditi", name: "Aditi R.", context: "Undergraduate learner", pattern: "stable", team: "nova" },
  { id: "rohan", name: "Rohan K.", context: "Junior analyst, 3rd week", pattern: "drifting", team: "nova" },
  { id: "zara", name: "Zara N.", context: "Support engineer", pattern: "mild", team: "nova" },
  { id: "meera", name: "Meera S.", context: "Support engineer", pattern: "recovering", team: "atlas" },
  { id: "kabir", name: "Kabir T.", context: "Product designer", pattern: "stable", team: "atlas" },
  { id: "ishaan", name: "Ishaan V.", context: "QA engineer", pattern: "stable", team: "atlas" },
];

const SENSITIVITY_MULT = { low: 0.7, medium: 1, high: 1.3 };

function dominantSignal(latest) {
  let key = SIGNAL_DEFS[0].key, val = -1;
  SIGNAL_DEFS.forEach((s) => { if (latest[s.key] > val) { val = latest[s.key]; key = s.key; } });
  return SIGNAL_DEFS.find((s) => s.key === key);
}

const TABS_COORDINATOR = [
  { id: "overview", label: "Overview" },
  { id: "explain", label: "Explainability" },
  { id: "context", label: "Context" },
  { id: "team", label: "Group view" },
  { id: "privacy", label: "Privacy & ethics" },
  { id: "architecture", label: "Architecture" },
];
const TABS_INDIVIDUAL = [
  { id: "overview", label: "My trends" },
  { id: "explain", label: "Why this reading" },
  { id: "privacy", label: "My privacy" },
];

/* ---------------- app ---------------- */

export default function DemoDashboard({ onExit }) {
  const [role, setRole] = useState("manager");
  const [userId, setUserId] = useState("rohan");
  const [tab, setTab] = useState("overview");
  const [autoLog, setAutoLog] = useState(false);
  const [historyMap, setHistoryMap] = useState(() => {
    const m = {};
    USERS.forEach((u) => { m[u.id] = buildHistory(u.pattern); });
    return m;
  });
  const [sliders, setSliders] = useState({ switching: 20, session: 20, checks: 20, screen: 20, night: 20, timing: 20 });
  const [settingsMap, setSettingsMap] = useState(() => {
    const m = {};
    USERS.forEach((u) => {
      m[u.id] = { tracking: true, sensitivity: "medium", context: "None", visibleToUser: true, retentionDays: 30 };
    });
    return m;
  });
  const [approvals, setApprovals] = useState({});

  const tabs = role === "individual" ? TABS_INDIVIDUAL : TABS_COORDINATOR;
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
    : "No defined trend: stable or improving";

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
        list.push({ id: `${userId}-${row.sessionNo}`, session: row.sessionNo, drift: row.drift, action: RESPONSES[d.key], signal: d.label });
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
    return { group: t.name, drift: avg, size: members.length };
  });

  function updateSetting(key, value) {
    setSettingsMap((prev) => ({ ...prev, [userId]: { ...prev[userId], [key]: value } }));
  }
  function logSession(overrideValues) {
    setHistoryMap((prev) => {
      const prevHistory = prev[userId];
      const row = { sessionNo: prevHistory.length + 1, ...(overrideValues || sliders) };
      row.drift = meanDrift(row);
      return { ...prev, [userId]: [...prevHistory, row] };
    });
  }

  // Automatic session logging: when enabled, periodically simulates a new
  // session by drifting the current slider values slightly, instead of
  // requiring a manual click on "Log this session".
  useEffect(() => {
    if (!autoLog || !tracking) return;
    const AUTO_LOG_INTERVAL_MS = 8000;
    const id = setInterval(() => {
      setSliders((prev) => {
        const next = {};
        SIGNAL_DEFS.forEach((s) => {
          const drifted = prev[s.key] + Math.round((Math.random() - 0.5) * 16);
          next[s.key] = Math.max(0, Math.min(100, drifted));
        });
        logSession(next);
        return next;
      });
    }, AUTO_LOG_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLog, tracking, userId]);
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
            <span className="text-slate-500 text-sm ml-1 hidden sm:inline">/ phone-use rhythm</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => { setRole("manager"); setTab("overview"); }}
                className={`px-3 py-1.5 rounded-md ${role === "manager" ? "bg-indigo-500 text-slate-950 font-medium" : "text-slate-400"}`}
              >
                Coordinator
              </button>
              <button
                onClick={() => { setRole("individual"); setTab("overview"); }}
                className={`px-3 py-1.5 rounded-md ${role === "individual" ? "bg-indigo-500 text-slate-950 font-medium" : "text-slate-400"}`}
              >
                Individual
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 border-l border-slate-800 pl-3">
              <span className="text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded-md px-2.5 py-1.5 font-medium">Simulated data</span>
              <button
                onClick={onExit}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-md px-2.5 py-1.5"
              >
                <ArrowLeft size={13} /> Back to login
              </button>
            </div>
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
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-3"><Zap size={14} /> Confidence</div>
                    <div className="text-3xl font-semibold">{confidence}%</div>
                    <div className="text-xs text-slate-500 mt-1">based on {history.length} sessions observed</div>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-3"><Clock size={14} /> If the trend continues</div>
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
                        <XAxis dataKey="sessionNo" stroke="#475569" fontSize={11} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={11} tickLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <ReferenceLine y={45} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Line type="monotone" dataKey="drift" stroke="#818CF8" strokeWidth={2.5} dot={{ r: 3, fill: "#818CF8" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                  <Card>
                    <SectionHead title="Latest session vs baseline" sub="Six tracked phone signals" />
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
                <div className="flex items-start justify-between gap-3 mb-4">
                  <SectionHead
                    title="Log a new session"
                    sub={autoLog ? "Auto-logging a new session every 8s from live drift" : "Describe this session's deviation from baseline, then log it"}
                  />
                  <button
                    onClick={() => setAutoLog((v) => !v)}
                    className={`shrink-0 flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border transition ${
                      autoLog ? "border-indigo-500 bg-indigo-950 text-indigo-300" : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {autoLog ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
                    {autoLog ? "Auto: on" : "Auto: off"}
                  </button>
                </div>
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
                  onClick={() => logSession()}
                  className="mt-5 w-full bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-medium text-sm rounded-lg py-2.5 transition flex items-center justify-center gap-1.5"
                >
                  Log this session <ChevronRight size={15} />
                </button>
              </Card>

              <Card>
                <SectionHead title="Suggestions" sub="Changes to schedules and interruptions for the group. Each one waits for a decision." />
                {events.length === 0 && <div className="text-sm text-slate-500 py-6 text-center">No suggestions yet.</div>}
                <div className="space-y-3">
                  {events.map((e) => {
                    const decision = approvals[e.id];
                    return (
                      <div key={e.id} className="border-l-2 border-amber-500 pl-3 py-1">
                        <div className="text-xs text-slate-500 font-mono mb-0.5">Session {e.session} · drift {e.drift}</div>
                        <div className="text-sm text-slate-200">{e.action}</div>
                        <div className="text-xs text-slate-500 mt-0.5 mb-1.5">Because of {e.signal.toLowerCase()}</div>
                        {decision ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${decision === "adopted" ? "bg-indigo-950 text-indigo-300" : "bg-slate-800 text-slate-400"}`}>
                            {decision === "adopted" ? "Adopted" : "Not now"}
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => decideEvent(e.id, "adopted")} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md"><Check size={12} /> Adopt</button>
                            <button onClick={() => decideEvent(e.id, "not_now")} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md"><X size={12} /> Not now</button>
                          </div>
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
                  This reading says the phone-use rhythm is shifting. It never states a diagnosis, a mental-health condition, or a judgement about anyone.
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ---------------- CONTEXT (coordinator only) ---------------- */}
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
              <div className="text-sm text-slate-500">No context tag active — readings show raw drift.</div>
            )}
            <div className="mt-4 text-xs text-slate-500 flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0" />
              While a tag is active, displayed drift is the raw drift minus 15 (never below 0).
            </div>
          </Card>
        )}

        {/* ---------------- GROUP (coordinator only) ---------------- */}
        {tab === "team" && role === "manager" && (
          <Card>
            <SectionHead title="Group-level aggregate" sub="Group trends only — no individual is singled out in this view" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={teamData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="group" stroke="#475569" fontSize={12} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="drift" fill="#818CF8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-xs text-slate-500 flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0" />
              Aggregate scores average every member's latest drift reading. No name, role, or individual score is exposed here — this view exists for schedule and interruption decisions, not performance review.
            </div>
          </Card>
        )}

        {/* ---------------- PRIVACY & ETHICS ---------------- */}
        {tab === "privacy" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionHead title={role === "individual" ? "My controls" : `Controls for ${user.name}`} />
              <Toggle checked={settings.tracking} onChange={(v) => updateSetting("tracking", v)} label="Behavioral tracking enabled" />
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

        {/* ---------------- ARCHITECTURE (coordinator only) ---------------- */}
        {tab === "architecture" && role === "manager" && <ArchitectureCard />}

        <Footer />
      </div>
    </div>
  );
}

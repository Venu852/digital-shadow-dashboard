import React from "react";
import { Shield, Users, Layers, LogOut, AlertCircle, Info } from "lucide-react";

/* ---------------- small UI helpers ---------------- */

export const TOOLTIP_STYLE = { background: "#0F172A", border: "1px solid #1E293B", borderRadius: 8, fontSize: 12 };

export function Card({ children, className = "" }) {
  return <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>{children}</div>;
}
export function SectionHead({ title, sub }) {
  return (
    <div className="mb-4">
      <div className="text-sm font-medium">{title}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
export function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`w-10 rounded-full relative transition disabled:opacity-60 ${checked ? "bg-indigo-500" : "bg-slate-700"}`}
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
export function Empty({ children }) {
  return <div className="text-sm text-slate-400 py-6 text-center">{children}</div>;
}
export function ErrorNote({ message, className = "" }) {
  if (!message) return null;
  return (
    <div className={`flex items-start gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2 ${className}`}>
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      {message}
    </div>
  );
}
export function Note({ children }) {
  return (
    <div className="text-xs text-slate-500 flex items-start gap-2">
      <Info size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/* ---------------- page frame ---------------- */

export function TopBar({ username, roleLabel, onLogout }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div>
        <span className="font-semibold tracking-tight text-lg">Digital Shadow</span>
        <span className="text-slate-500 text-sm ml-1 hidden sm:inline">/ behavioral forecasting console</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-400">{roleLabel}</span>
        <div className="flex items-center gap-2 text-xs text-slate-500 border-l border-slate-800 pl-3">
          <span className="hidden sm:inline">Signed in as <span className="text-slate-300">{username}</span></span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-md px-2.5 py-1.5"
          >
            <LogOut size={13} /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}

export function TabBar({ tabs, tab, onChange }) {
  return (
    <div className="flex gap-1 mb-6 border-b border-slate-800 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${
            tab === t.id ? "border-indigo-400 text-slate-100" : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Footer() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600 border-t border-slate-900 pt-5 mt-6">
      <Users size={13} />
      No biometric, emotional, or personal content is collected — only interaction rhythm, compared against each person's own baseline.
    </div>
  );
}

/* ---------------- shared content ---------------- */

export function EthicalGuarantees() {
  return (
    <Card>
      <SectionHead title="Ethical guarantees" sub="These principles are embedded across every layer, not written as policy alone" />
      <ul className="space-y-2.5 text-sm text-slate-300">
        <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> No identity inference — the system reasons about patterns, not people.</li>
        <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> No mental-health claims or diagnostic language, ever.</li>
        <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> No individual punishment mechanisms — insights inform systems, not grading or firing.</li>
        <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> No biometric, voice, facial, or content data is ever collected. Phones send only a daily summary — no app names, no raw data.</li>
        <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> Sharing can be turned off at any time, with no penalty — you leave every manager view at once.</li>
        <li className="flex gap-2"><Shield size={15} className="text-indigo-400 mt-0.5 shrink-0" /> Every time a manager views a person, it is logged and that person can read the log.</li>
      </ul>
    </Card>
  );
}

export const LAYERS = [
  { n: "01", title: "Interaction capture", desc: "Collects scroll speed, pause duration, typing cadence, app-switch frequency and session timing. Never content, voice, face or biometric data." },
  { n: "02", title: "Behavior abstraction", desc: "Converts raw events into features like scroll entropy and pause-action ratio. Looks at trends across time, not single actions." },
  { n: "03", title: "Personal baseline engine", desc: "Learns each user's own normal rhythm during a silent calibration window. Compares a person only against their past self." },
  { n: "04", title: "Drift and deviation analyzer", desc: "Detects directional change, not sudden anomalies. Reports that behavior is shifting, never that a person is burned out." },
  { n: "05", title: "Future-state prediction engine", desc: "Estimates where behavior is heading, with a probability and a time horizon, before performance visibly drops." },
  { n: "06", title: "Response and adaptation layer", desc: "Adjusts pacing, difficulty and workload quietly. No alerts, no labels, no 'you are at risk' messages." },
];

export function ArchitectureCard() {
  return (
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
  );
}

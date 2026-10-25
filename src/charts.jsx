import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ReferenceLine
} from "recharts";
import { Card, SectionHead, TOOLTIP_STYLE } from "./ui.jsx";
import { radarData, shortDay, DRIFT_REFERENCE } from "./signals.js";

export function StatTile({ icon: Icon, label, children }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-slate-500 text-xs mb-3"><Icon size={14} /> {label}</div>
      {children}
    </Card>
  );
}

export function DriftTrendCard({ title = "Drift trend", sub, data, dataKey, name = "Drift" }) {
  const rows = data.map((d) => ({ ...d, label: shortDay(d.day) }));
  return (
    <Card>
      <SectionHead title={title} sub={sub} />
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} />
          <YAxis stroke="#475569" fontSize={11} tickLine={false} domain={[0, 100]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <ReferenceLine y={DRIFT_REFERENCE} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Line type="monotone" dataKey={dataKey} name={name} stroke="#818CF8" strokeWidth={2.5} dot={{ r: 3, fill: "#818CF8" }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function LevelsRadarCard({ title, sub = "Six tracked phone signals", levels }) {
  return (
    <Card>
      <SectionHead title={title} sub={sub} />
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData(levels)} outerRadius={75}>
          <PolarGrid stroke="#1E293B" />
          <PolarAngleAxis dataKey="signal" stroke="#64748B" fontSize={11} />
          <Radar name="Baseline" dataKey="baseline" stroke="#475569" fill="#475569" fillOpacity={0.25} />
          <Radar name="Current" dataKey="current" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function FactorList({ factors }) {
  return (
    <div className="space-y-4">
      {factors.map((f) => (
        <div key={f.key} className="flex items-start gap-4">
          <div className="w-14 text-right font-mono text-sm text-indigo-400 pt-0.5">{f.pct}%</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-200">{f.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{f.cause}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

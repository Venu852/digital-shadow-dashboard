import React, { useState } from "react";
import { Activity, Shield, Zap, Clock, Trash2, Smartphone, Eye, Users, Lightbulb, LogOut as Leave } from "lucide-react";
import { useApi, put, post, del } from "./api.js";
import { Card, SectionHead, Empty, ErrorNote, Note, TopBar, TabBar, Footer, EthicalGuarantees } from "./ui.jsx";
import { StatTile, DriftTrendCard, LevelsRadarCard, FactorList } from "./charts.jsx";
import { withColor } from "./signals.js";

const TABS = [
  { id: "overview", label: "My trends" },
  { id: "explain", label: "Why this reading" },
  { id: "privacy", label: "My privacy" },
];

export const SHARING_OPTIONS = [
  {
    level: "nothing",
    title: "Nothing",
    text: "Your phone keeps its readings to itself. The server stores nothing new and no coordinator sees anything about you.",
  },
  {
    level: "team_totals",
    title: "Group totals",
    text: "Your daily summary counts toward your groups' averages, shown only when 3 or more people share. No one sees your own numbers.",
  },
  {
    level: "my_trend",
    title: "My drift trend",
    text: "Coordinators of groups you joined can also see your own drift trend and why it reads that way. Every view is logged for you below.",
  },
];

const ACCESS_ACTIONS = {
  view_trend: "viewed your drift trend",
  view_explain: "viewed why your reading changed",
};

const when = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

export default function IndividualApp({ account, onLogout, onAccountDeleted }) {
  const [tab, setTab] = useState("overview");
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <TopBar username={account.username} roleLabel="Individual view" onLogout={onLogout} />
        <TabBar tabs={TABS} tab={tab} onChange={setTab} />
        {tab === "overview" && <MyTrends />}
        {tab === "explain" && <MyExplain />}
        {tab === "privacy" && <MyPrivacy onAccountDeleted={onAccountDeleted} />}
        <Footer />
      </div>
    </div>
  );
}

/* ---------------- My trends ---------------- */

function MyTrends() {
  const { data, error, loading } = useApi("/api/me/trend?days=14");
  if (loading) return null;
  if (error) return <Card><ErrorNote message={error} /></Card>;
  if (!data || !data.latest) {
    return <Card><Empty>No readings yet. Pair your phone in the Digital Shadow app; your first daily summary will appear here.</Empty></Card>;
  }

  const status = withColor(data.status);
  const latest = data.latest;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile icon={Activity} label="Drift score">
          <div className="text-3xl font-semibold" style={{ color: status.color }}>{latest.drift}</div>
          <div className="text-xs mt-1" style={{ color: status.color }}>{status.label}</div>
          {data.context.length > 0 && (
            <div className="text-xs text-slate-500 mt-1">raw {latest.drift_raw}, context: {data.context.join(", ")}</div>
          )}
        </StatTile>
        <StatTile icon={Zap} label="Confidence">
          <div className="text-3xl font-semibold">{latest.confidence}%</div>
          <div className="text-xs text-slate-500 mt-1">based on {data.days_observed} days observed</div>
        </StatTile>
        <StatTile icon={Clock} label="If the trend continues">
          <div className="text-sm font-medium leading-snug">{data.horizon}</div>
        </StatTile>
        <StatTile icon={Shield} label="Baseline">
          <div className="text-lg font-medium">{data.baseline_established ? "Established" : "Calibrating"}</div>
          <div className="text-xs text-slate-500 mt-1">{data.baseline_established ? "Personalized to you" : "Your phone is still learning your normal"}</div>
        </StatTile>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <DriftTrendCard sub="Deviation from your personal baseline, by day" data={data.days} dataKey="drift" />
        <LevelsRadarCard title="Latest day vs baseline" levels={latest.levels} />
      </div>
      <SuggestionsCard />
    </>
  );
}

function SuggestionsCard() {
  const { data, error, loading } = useApi("/api/me/suggestions");
  if (loading) return null;
  return (
    <Card className="mb-6">
      <SectionHead title="Suggestions for you" sub="Only you see these" />
      {error ? <ErrorNote message={error} /> : data.length === 0 ? (
        <div className="text-sm text-slate-500">Nothing to suggest: your rhythm is close to your usual.</div>
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <div key={s.signal} className="flex items-start gap-3">
              <Lightbulb size={15} className="text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm text-slate-200">{s.text}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}: {s.because}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------- Why this reading ---------------- */

function MyExplain() {
  const { data, error, loading } = useApi("/api/me/explain");
  return (
    <Card>
      <SectionHead title="Why this reading" sub={data && data.day ? `Your latest daily summary (${data.day}), in plain language` : "Cause and effect, in plain language — no technical jargon"} />
      {loading ? null : error ? <ErrorNote message={error} /> : !data || data.factors.length === 0 ? (
        <Empty>No readings yet, so there is nothing to explain.</Empty>
      ) : (
        <>
          <FactorList factors={data.factors} />
          <div className="border-t border-slate-800 pt-4 mt-4"><Note>{data.note}</Note></div>
        </>
      )}
    </Card>
  );
}

/* ---------------- My privacy ---------------- */

function MyPrivacy({ onAccountDeleted }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <SharingCard />
        <TeamsCard />
        <DevicesCard />
      </div>
      <div className="space-y-4">
        <AccessLogCard />
        <DeleteCard onAccountDeleted={onAccountDeleted} />
        <EthicalGuarantees />
      </div>
    </div>
  );
}

function SharingCard() {
  const { data, error, loading } = useApi("/api/me/sharing");
  const [level, setLevel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const current = level || (data && data.level);

  async function choose(next) {
    setSaving(true);
    setSaveError("");
    try {
      const res = await put("/api/me/sharing", { level: next });
      setLevel(res.level);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <SectionHead title="What I share" sub="Changes apply at once to every view. Your phone keeps working whatever you pick." />
      {loading ? null : error ? <ErrorNote message={error} /> : (
        <div className="space-y-2">
          {SHARING_OPTIONS.map((o) => (
            <button
              key={o.level}
              disabled={saving}
              onClick={() => choose(o.level)}
              className={`w-full px-3 py-2.5 rounded-lg border text-left ${
                current === o.level ? "border-indigo-500 bg-indigo-950" : "border-slate-800 bg-slate-950 hover:border-slate-700"
              }`}
            >
              <div className="text-sm font-medium">{o.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{o.text}</div>
            </button>
          ))}
        </div>
      )}
      <ErrorNote message={saveError} className="mt-3" />
    </Card>
  );
}

function TeamsCard() {
  const { data, error, loading, reload } = useApi("/api/teams");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function run(fn) {
    setBusy(true);
    setActionError("");
    try {
      await fn();
      reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function join(e) {
    e.preventDefault();
    if (!code.trim()) return;
    run(async () => {
      await post("/api/teams/join", { invite_code: code.trim() });
      setCode("");
    });
  }

  return (
    <Card>
      <SectionHead title="My groups" sub="Join with the invite code your coordinator gave you. A coordinator cannot add you." />
      <form onSubmit={join} className="flex gap-2 mb-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Invite code"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button disabled={busy} className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-slate-950 font-medium text-sm rounded-lg px-4">Join</button>
      </form>
      {loading ? null : error ? <ErrorNote message={error} /> : data.length === 0 ? (
        <div className="text-sm text-slate-500">You haven't joined a group yet.</div>
      ) : (
        <div className="space-y-2">
          {data.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
              <span className="text-sm flex items-center gap-2"><Users size={14} className="text-slate-500" /> {t.name}</span>
              <button
                disabled={busy}
                onClick={() => run(() => del(`/api/teams/${t.id}/membership`))}
                className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md"
              >
                <Leave size={12} /> Leave
              </button>
            </div>
          ))}
        </div>
      )}
      <ErrorNote message={actionError} className="mt-3" />
    </Card>
  );
}

function DevicesCard() {
  const { data, error, loading, reload } = useApi("/api/devices");
  const [actionError, setActionError] = useState("");

  async function revoke(id) {
    setActionError("");
    try {
      await del(`/api/devices/${id}`);
      reload();
    } catch (e) {
      setActionError(e.message);
    }
  }

  return (
    <Card>
      <SectionHead title="My devices" sub="Phones paired from the Digital Shadow app. A revoked phone can no longer upload, and its days stop counting." />
      {loading ? null : error ? <ErrorNote message={error} /> : data.length === 0 ? (
        <div className="text-sm text-slate-500">No phone paired yet.</div>
      ) : (
        <div className="space-y-2">
          {data.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
              <div>
                <div className="text-sm flex items-center gap-2"><Smartphone size={14} className="text-slate-500" /> {d.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Last seen {when(d.last_seen_at)}</div>
              </div>
              {d.revoked ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Revoked</span>
              ) : (
                <button onClick={() => revoke(d.id)} className="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md">Revoke</button>
              )}
            </div>
          ))}
        </div>
      )}
      <ErrorNote message={actionError} className="mt-3" />
    </Card>
  );
}

function AccessLogCard() {
  const { data, error, loading } = useApi("/api/me/access-log");
  return (
    <Card>
      <SectionHead title="Who viewed me" sub="Every time a coordinator opens your trend or explanation, it is written here." />
      {loading ? null : error ? <ErrorNote message={error} /> : data.length === 0 ? (
        <div className="text-sm text-slate-500">No one has viewed your data.</div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {data.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Eye size={14} className="text-slate-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-200">{r.by || "A deleted account"}</span>{" "}
                <span className="text-slate-400">{ACCESS_ACTIONS[r.action] || r.action}</span>
                {r.team && <span className="text-slate-500"> · {r.team}</span>}
                <div className="text-xs text-slate-500 font-mono">{when(r.at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DeleteCard({ onAccountDeleted }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function deleteData() {
    if (!window.confirm("Delete every daily summary stored for you? Your baseline will restart.")) return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await del("/api/me/data");
      setMessage("Your stored readings were deleted.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!password) {
      setError("Enter your password to delete your account.");
      return;
    }
    if (!window.confirm("Delete your account and everything attached to it? This cannot be undone.")) return;
    setBusy(true);
    try {
      await del("/api/me", { password });
      onAccountDeleted();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionHead title="Delete" sub="Removing data is immediate and needs no one's approval." />
      <button
        onClick={deleteData}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 text-sm border border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-60 rounded-lg py-2.5 transition"
      >
        <Trash2 size={14} /> Delete my data and restart baseline
      </button>
      <form onSubmit={deleteAccount} className="mt-4 pt-4 border-t border-slate-800 space-y-2">
        <input
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 text-sm border border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-60 rounded-lg py-2.5 transition"
        >
          <Trash2 size={14} /> Delete my account
        </button>
      </form>
      {message && <div className="text-xs text-indigo-300 mt-3">{message}</div>}
      <ErrorNote message={error} className="mt-3" />
    </Card>
  );
}

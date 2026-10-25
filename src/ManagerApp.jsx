import React, { useState, useEffect } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Activity, Users, Clock, Tag, Check, X, Plus, RefreshCw, EyeOff, Shield, Ban, Zap } from "lucide-react";
import { useApi, put, post } from "./api.js";
import {
  Card, SectionHead, Empty, ErrorNote, Note, TopBar, TabBar, Footer,
  EthicalGuarantees, ArchitectureCard, TOOLTIP_STYLE
} from "./ui.jsx";
import { StatTile, DriftTrendCard, LevelsRadarCard, FactorList } from "./charts.jsx";
import { withColor, levelBreakdown } from "./signals.js";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "explain", label: "Explainability" },
  { id: "context", label: "Context" },
  { id: "team", label: "Group view" },
  { id: "privacy", label: "Privacy & ethics" },
  { id: "architecture", label: "Architecture" },
];

const HIDDEN_TEXT = "Hidden: fewer than 3 people share";
const DAYS = 14;

function HiddenCard() {
  return (
    <Card className="flex items-center gap-3">
      <EyeOff size={16} className="text-slate-500 shrink-0" />
      <div className="text-sm text-slate-400">
        {HIDDEN_TEXT}. Group numbers appear once 3 or more members choose "Group totals" or "My drift trend".
      </div>
    </Card>
  );
}

export default function ManagerApp({ account, onLogout }) {
  const [tab, setTab] = useState("overview");
  const overview = useApi("/api/manager/overview");
  const teamList = useApi("/api/teams");
  const [teamId, setTeamId] = useState(null);
  const [person, setPerson] = useState(null);

  const teams = overview.data ? overview.data.teams : [];
  const team = teams.find((t) => t.id === teamId) || null;

  // Keep a valid team selected as the list loads or changes
  useEffect(() => {
    if (!overview.data) return;
    if (!teams.some((t) => t.id === teamId)) setTeamId(teams.length ? teams[0].id : null);
  }, [overview.data]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectTeam(id) {
    setTeamId(id);
    setPerson(null);
  }
  function refreshTeams(selectId) {
    overview.reload();
    teamList.reload();
    if (selectId) selectTeam(selectId);
  }

  const needsTeam = ["overview", "explain", "context"].includes(tab);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <TopBar username={account.username} roleLabel="Coordinator view" onLogout={onLogout} />

        <ErrorNote message={overview.error} className="mb-6" />

        {/* group selector */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTeam(t.id)}
              className={`px-4 py-2.5 rounded-lg border text-left transition ${
                t.id === teamId ? "border-indigo-500 bg-indigo-950" : "border-slate-800 bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-slate-500">
                {t.hidden ? HIDDEN_TEXT : t.status ? `${t.status.label} · ${t.contributors} sharing` : `${t.contributors} sharing · no data yet`}
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <CreateTeamCard onCreated={(id) => refreshTeams(id)} />
          {team && (
            <InviteCard
              team={team}
              invite={teamList.data ? (teamList.data.find((t) => t.id === team.id) || {}).invite_code : null}
              onRotated={() => teamList.reload()}
            />
          )}
        </div>

        <TabBar tabs={TABS} tab={tab} onChange={setTab} />

        {needsTeam && !team && !overview.loading && (
          <Card><Empty>Create a group, then share its invite code. People join on their own; you cannot add them.</Empty></Card>
        )}

        {tab === "overview" && team && (
          <TeamOverview key={team.id} teamId={team.id} person={person} onSelectPerson={setPerson} onChanged={() => overview.reload()} />
        )}
        {tab === "explain" && team && <Explainability key={team.id} teamId={team.id} person={person} onClearPerson={() => setPerson(null)} />}
        {tab === "context" && team && <ContextTab key={team.id} teamId={team.id} teamName={team.name} onChanged={() => overview.reload()} />}
        {tab === "team" && <TeamView teams={teams} loading={overview.loading} />}
        {tab === "privacy" && <ManagerPrivacy />}
        {tab === "architecture" && <ArchitectureCard />}

        <Footer />
      </div>
    </div>
  );
}

/* ---------------- teams and invites ---------------- */

function CreateTeamCard({ onCreated }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      setError("Group name must be 2-40 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await post("/api/teams", { name: trimmed });
      setName("");
      onCreated(res.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionHead title="Create a group" sub="You get an invite code to share; people join with it themselves." />
      <form onSubmit={create} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button disabled={busy} className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-slate-950 font-medium text-sm rounded-lg px-4">
          <Plus size={14} /> Create
        </button>
      </form>
      <ErrorNote message={error} className="mt-3" />
    </Card>
  );
}

function InviteCard({ team, invite, onRotated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function rotate() {
    setBusy(true);
    setError("");
    try {
      await post(`/api/teams/${team.id}/invite/rotate`);
      onRotated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionHead title={`Invite code for ${team.name}`} sub="Rotating makes the old code stop working. People already in the group stay." />
      <div className="flex items-center gap-3">
        <div className="flex-1 font-mono text-lg tracking-widest text-indigo-300 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">{invite || "—"}</div>
        <button onClick={rotate} disabled={busy} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-60 px-3 py-2 rounded-md">
          <RefreshCw size={12} /> Rotate
        </button>
      </div>
      <ErrorNote message={error} className="mt-3" />
    </Card>
  );
}

/* ---------------- Overview ---------------- */

function TeamOverview({ teamId, person, onSelectPerson, onChanged }) {
  const agg = useApi(`/api/teams/${teamId}/aggregate?days=${DAYS}`);
  const people = useApi(`/api/teams/${teamId}/people`);

  return (
    <>
      {agg.error ? <Card className="mb-6"><ErrorNote message={agg.error} /></Card> : agg.loading ? null : agg.data.hidden ? (
        <div className="mb-6"><HiddenCard /></div>
      ) : !agg.data.latest ? (
        <Card className="mb-6"><Empty>No day yet with 3 or more people's data, so there is no group average to show.</Empty></Card>
      ) : (
        <TeamAggregate agg={agg.data} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <SectionHead title="People" sub={`Only members who chose "My drift trend". Opening a trend is logged and they can see it.`} />
          {people.loading ? null : people.error ? <ErrorNote message={people.error} /> : people.data.people.length === 0 ? (
            <div className="text-sm text-slate-500 py-6 text-center">No one in this group shares their own trend.</div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {people.data.people.map((p) => (
                <button
                  key={p.account_id}
                  onClick={() => onSelectPerson(person && person.account_id === p.account_id ? null : p)}
                  className={`px-4 py-2 rounded-lg border text-sm transition ${
                    person && person.account_id === p.account_id ? "border-indigo-500 bg-indigo-950" : "border-slate-800 bg-slate-950 hover:border-slate-700"
                  }`}
                >
                  {p.username}
                </button>
              ))}
            </div>
          )}
        </Card>
        <ActionsCard teamId={teamId} onChanged={onChanged} />
      </div>

      {person && (
        <PersonTrend
          key={person.account_id}
          teamId={teamId}
          person={person}
          onGone={() => { onSelectPerson(null); people.reload(); }}
        />
      )}
    </>
  );
}

function TeamAggregate({ agg }) {
  const status = withColor(agg.status);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile icon={Activity} label="Average drift">
          <div className="text-3xl font-semibold" style={{ color: status.color }}>{agg.latest.avg}</div>
          <div className="text-xs mt-1" style={{ color: status.color }}>{status.label}</div>
        </StatTile>
        <StatTile icon={Users} label="Contributors">
          <div className="text-3xl font-semibold">{agg.latest.contributors}</div>
          <div className="text-xs text-slate-500 mt-1">people with data on {agg.latest.day}</div>
        </StatTile>
        <StatTile icon={Clock} label="If the trend continues">
          <div className="text-sm font-medium leading-snug">{agg.horizon}</div>
        </StatTile>
        <StatTile icon={Tag} label="Context">
          <div className="text-lg font-medium">{agg.context}</div>
          <div className="text-xs text-slate-500 mt-1">{agg.context !== "None" ? `raw average ${agg.latest.avg_raw}` : "readings are raw drift"}</div>
        </StatTile>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <DriftTrendCard title="Group drift trend" sub="Average deviation from personal baselines, by day" data={agg.series} dataKey="avg" name="Average drift" />
        <LevelsRadarCard title="Group signal levels vs baseline" sub="Average of the six phone signals on the latest day" levels={agg.levels_avg} />
      </div>
    </>
  );
}

function ActionsCard({ teamId, onChanged }) {
  const { data, error, loading, reload } = useApi(`/api/teams/${teamId}/actions`);
  const [actionError, setActionError] = useState("");

  async function decide(day, decision) {
    setActionError("");
    try {
      await put(`/api/teams/${teamId}/actions/${day}`, { decision });
      reload();
      onChanged();
    } catch (e) {
      setActionError(e.message);
    }
  }

  return (
    <Card>
      <SectionHead
        title="Suggestions"
        sub="Changes to schedules and interruptions for the group. Each one waits for your decision."
      />
      {loading ? null : error ? <ErrorNote message={error} /> : data.hidden ? (
        <div className="text-sm text-slate-500 py-6 text-center">{HIDDEN_TEXT}.</div>
      ) : data.actions.length === 0 ? (
        <div className="text-sm text-slate-500 py-6 text-center">No suggestions yet.</div>
      ) : (
        <div className="space-y-3">
          {data.actions.map((a) => (
            <div key={a.day} className="border-l-2 border-amber-500 pl-3 py-1">
              <div className="text-xs text-slate-500 font-mono mb-0.5">{a.day} · group drift {a.drift}</div>
              <div className="text-sm text-slate-200">{a.action}</div>
              <div className="text-xs text-slate-500 mt-0.5 mb-1.5">Because of {a.signal_label.toLowerCase()}</div>
              {a.status === "pending" ? (
                <div className="flex gap-2">
                  <button onClick={() => decide(a.day, "approved")} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md"><Check size={12} /> Adopt</button>
                  <button onClick={() => decide(a.day, "dismissed")} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md"><X size={12} /> Not now</button>
                </div>
              ) : a.status === "applied" ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300">Applied automatically</span>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "approved" ? "bg-indigo-950 text-indigo-300" : "bg-slate-800 text-slate-400"}`}>
                  {a.status === "approved" ? "Adopted" : "Not now"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <ErrorNote message={actionError} className="mt-3" />
    </Card>
  );
}

function PersonTrend({ teamId, person, onGone }) {
  const { data, error, loading } = useApi(`/api/teams/${teamId}/people/${person.account_id}/trend?days=${DAYS}`);

  if (loading) return null;
  if (error) {
    return (
      <Card className="mb-6">
        <ErrorNote message={error.includes("not found") ? `${person.username} no longer shares their trend with this group.` : error} />
        <button onClick={onGone} className="mt-3 text-xs border border-slate-800 hover:border-slate-700 rounded-md px-3 py-1.5 text-slate-300">Refresh people</button>
      </Card>
    );
  }
  if (!data.latest) {
    return <Card className="mb-6"><Empty>{person.username} has no readings yet.</Empty></Card>;
  }

  const status = withColor(data.status);
  return (
    <>
      <div className="text-sm font-medium mb-3">{person.username}'s drift trend</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile icon={Activity} label="Drift score">
          <div className="text-3xl font-semibold" style={{ color: status.color }}>{data.latest.drift}</div>
          <div className="text-xs mt-1" style={{ color: status.color }}>{status.label}</div>
          {data.context.length > 0 && <div className="text-xs text-slate-500 mt-1">raw {data.latest.drift_raw}, context: {data.context.join(", ")}</div>}
        </StatTile>
        <StatTile icon={Zap} label="Confidence">
          <div className="text-3xl font-semibold">{data.latest.confidence}%</div>
          <div className="text-xs text-slate-500 mt-1">based on {data.days_observed} days observed</div>
        </StatTile>
        <StatTile icon={Clock} label="If the trend continues">
          <div className="text-sm font-medium leading-snug">{data.horizon}</div>
        </StatTile>
        <StatTile icon={Shield} label="Baseline">
          <div className="text-lg font-medium">{data.baseline_established ? "Established" : "Calibrating"}</div>
        </StatTile>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <DriftTrendCard sub="Deviation from their own baseline, by day" data={data.days} dataKey="drift" />
        <LevelsRadarCard title="Latest day vs baseline" levels={data.latest.levels} />
      </div>
    </>
  );
}

/* ---------------- Explainability ---------------- */

function Explainability({ teamId, person, onClearPerson }) {
  return person
    ? <PersonExplain teamId={teamId} person={person} onClearPerson={onClearPerson} />
    : <TeamExplain teamId={teamId} />;
}

function PersonExplain({ teamId, person, onClearPerson }) {
  const { data, error, loading } = useApi(`/api/teams/${teamId}/people/${person.account_id}/explain`);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <SectionHead title={`Why ${person.username}'s reading looks this way`} sub="Cause and effect, in plain language. This view is logged and they can see it." />
        <button onClick={onClearPerson} className="shrink-0 text-xs border border-slate-800 hover:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-400">Show group instead</button>
      </div>
      {loading ? null : error ? (
        <ErrorNote message={error.includes("not found") ? `${person.username} no longer shares their trend with this group.` : error} />
      ) : data.factors.length === 0 ? (
        <Empty>{person.username} has no readings yet.</Empty>
      ) : (
        <>
          <FactorList factors={data.factors} />
          <div className="border-t border-slate-800 pt-4 mt-4"><Note>{data.note}</Note></div>
        </>
      )}
    </Card>
  );
}

function TeamExplain({ teamId }) {
  const { data, error, loading } = useApi(`/api/teams/${teamId}/aggregate?days=${DAYS}`);
  if (loading) return null;
  if (error) return <Card><ErrorNote message={error} /></Card>;
  if (data.hidden) return <HiddenCard />;
  return (
    <Card>
      <SectionHead title="Why this reading" sub="Average of the six signals across people who share. Pick a person on Overview to see theirs." />
      {!data.levels_avg ? (
        <Empty>No day yet with 3 or more people's data.</Empty>
      ) : (
        <>
          <FactorList factors={levelBreakdown(data.levels_avg)} />
          <div className="border-t border-slate-800 pt-4 mt-4">
            <Note>This reading says the group's phone-use rhythm is shifting. It never states a diagnosis, a mental-health condition, or a judgement about anyone.</Note>
          </div>
        </>
      )}
    </Card>
  );
}

/* ---------------- Context ---------------- */

function ContextTab({ teamId, teamName, onChanged }) {
  const settings = useApi(`/api/teams/${teamId}/settings`);
  const agg = useApi(`/api/teams/${teamId}/aggregate?days=${DAYS}`);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = saved || settings.data;

  async function update(body) {
    setBusy(true);
    setError("");
    try {
      setSaved(await put(`/api/teams/${teamId}/settings`, body));
      agg.reload();
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (settings.loading) return null;
  if (settings.error) return <Card><ErrorNote message={settings.error} /></Card>;

  const latest = agg.data && !agg.data.hidden ? agg.data.latest : null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <SectionHead title="Context awareness" sub="Tag known circumstances so the baseline isn't misread as drift" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
          {current.context_options.map((tag) => (
            <button
              key={tag}
              disabled={busy}
              onClick={() => update({ context_tag: tag })}
              className={`px-3 py-2.5 rounded-lg border text-sm text-left ${
                current.context_tag === tag ? "border-indigo-500 bg-indigo-950" : "border-slate-800 bg-slate-950 hover:border-slate-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        {current.context_tag !== "None" ? (
          <div className="text-sm text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-4">
            Context <span className="text-indigo-400 font-medium">{current.context_tag}</span> is active for {teamName}.
            {latest ? (
              <> Raw group drift on {latest.day} was <span className="font-mono">{latest.avg_raw}</span>,
                displayed as <span className="font-mono">{latest.avg}</span> after context adjustment, to avoid a false alarm.</>
            ) : " "}
            {" "}Displayed drift is the raw drift lowered by 15, never below 0; the raw value is always kept and shown next to it. People's own trends viewed from this group are adjusted the same way.
          </div>
        ) : (
          <div className="text-sm text-slate-500">No context tag active — readings show raw drift.</div>
        )}
        <div className="mt-4"><Note>While a tag is active, displayed drift is the raw drift minus 15 (never below 0).</Note></div>
        <ErrorNote message={error} className="mt-3" />
      </Card>
    </div>
  );
}

/* ---------------- Team view ---------------- */

function TeamView({ teams, loading }) {
  if (loading) return null;
  if (teams.length === 0) return <Card><Empty>You have no groups yet.</Empty></Card>;
  const bars = teams.filter((t) => !t.hidden && t.avg !== null).map((t) => ({ group: t.name, drift: t.avg }));
  return (
    <Card>
      <SectionHead title="Group-level aggregate" sub="Group trends only — no individual is singled out in this view" />
      {bars.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bars} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis dataKey="group" stroke="#475569" fontSize={12} tickLine={false} />
            <YAxis stroke="#475569" fontSize={11} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="drift" name="Average drift" fill="#818CF8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Empty>No group has enough people sharing to show an average yet.</Empty>
      )}
      <div className="mt-4 space-y-2">
        {teams.map((t) => {
          const status = withColor(t.status);
          return (
            <div key={t.id} className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm">
              <span>{t.name}</span>
              {t.hidden ? (
                <span className="text-xs text-slate-500 flex items-center gap-1.5"><EyeOff size={12} /> {HIDDEN_TEXT}</span>
              ) : t.avg === null ? (
                <span className="text-xs text-slate-500">No day with 3 or more people's data yet</span>
              ) : (
                <span className="text-xs text-slate-400">
                  <span className="font-mono" style={{ color: status.color }}>{t.avg}</span> · <span style={{ color: status.color }}>{status.label}</span> · {t.contributors} of {t.members} sharing
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <Note>Aggregate scores average the latest daily drift of people who share. No name or individual score is exposed here — this view exists for schedule and interruption decisions, not performance review.</Note>
      </div>
    </Card>
  );
}

/* ---------------- Privacy & ethics ---------------- */

function ManagerPrivacy() {
  const can = [
    "Group averages, only when 3 or more members share and only for days where 3 or more of them have data.",
    "The drift trend and explanation of a member who chose \"My drift trend\" — every view is logged and they can read the log.",
    "Your groups' invite codes and context tags.",
  ];
  const cannot = [
    "Anyone who chose \"Nothing\" or \"Group totals\" as an individual.",
    "Names or account ids inside group averages.",
    "App names, raw phone data, messages or any content — phones send only a daily summary.",
    "A person after they lower their sharing or leave the group: they disappear from your views at once.",
    "Context set by another group's coordinator.",
    "Adding people to a group: they join only with your invite code.",
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <SectionHead title="What a coordinator can and cannot see" sub="Checked by the server on every request, not just hidden in this page" />
        <div className="text-xs text-slate-500 mb-2">Can see</div>
        <ul className="space-y-2.5 text-sm text-slate-300 mb-5">
          {can.map((t) => <li key={t} className="flex gap-2"><Check size={15} className="text-indigo-400 mt-0.5 shrink-0" /> {t}</li>)}
        </ul>
        <div className="text-xs text-slate-500 mb-2">Cannot see</div>
        <ul className="space-y-2.5 text-sm text-slate-300">
          {cannot.map((t) => <li key={t} className="flex gap-2"><Ban size={15} className="text-slate-500 mt-0.5 shrink-0" /> {t}</li>)}
        </ul>
      </Card>
      <EthicalGuarantees />
    </div>
  );
}

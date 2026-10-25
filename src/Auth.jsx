import React, { useState } from "react";
import { Lock, User, UserPlus, LogIn, Eye, EyeOff, AlertCircle, PlayCircle } from "lucide-react";
import { get, post } from "./api.js";

/* ---------------- session (kept by the server in an HttpOnly cookie) ---------------- */

// The signed-in account, or null when there is no session
export async function fetchAccount() {
  try {
    return await get("/api/me");
  } catch (e) {
    if (e.status === 401) return null;
    throw e;
  }
}

export async function logout() {
  await post("/api/logout");
}

const USERNAME_RE = /^[a-z0-9_.-]{3,32}$/;
const MIN_PASSWORD = 8;
// [API role value, label]; the coordinator role is stored as "manager"
const ROLE_OPTIONS = [["individual", "Individual"], ["manager", "Coordinator"]];

/* ---------------- small UI bits (kept local so this file has no cross-import) ---------------- */

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        {...props}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}

/* ---------------- login / signup page ---------------- */

export default function LoginPage({ onAuthenticated, onDemo }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accountRole, setAccountRole] = useState("individual");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetFields() {
    setPassword("");
    setConfirm("");
    setError("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    const uname = username.trim().toLowerCase();
    if (!uname || !password) {
      setError("Enter a username and password.");
      return;
    }
    setBusy(true);
    try {
      const account = await post("/api/login", { username: uname, password });
      onAuthenticated(account);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    const uname = username.trim().toLowerCase();
    if (!USERNAME_RE.test(uname)) {
      setError("Username must be 3-32 characters: letters, numbers, dot, dash or underscore.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      // Registering also signs the new account in
      const account = await post("/api/register", { username: uname, password, role: accountRole });
      onAuthenticated(account);
    } catch (err) {
      setError(err.status === 409 ? "That username is already taken." : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div>
          <span className="font-semibold tracking-tight text-lg">Digital Shadow</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); resetFields(); }}
              className={`flex-1 px-3 py-1.5 rounded-md transition ${mode === "login" ? "bg-indigo-500 text-slate-950 font-medium" : "text-slate-400"}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); resetFields(); }}
              className={`flex-1 px-3 py-1.5 rounded-md transition ${mode === "signup" ? "bg-indigo-500 text-slate-950 font-medium" : "text-slate-400"}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-3">
            <Field
              icon={User}
              type="text"
              placeholder="Username"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
            <div className="relative">
              <Field
                icon={Lock}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {mode === "signup" && (
              <>
                <Field
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <div>
                  <div className="text-xs text-slate-500 mb-1.5">Account type</div>
                  <div className="flex gap-2">
                    {ROLE_OPTIONS.map(([r, label]) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAccountRole(r)}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                          accountRole === r ? "border-indigo-500 bg-indigo-950" : "border-slate-800 bg-slate-950 hover:border-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-slate-950 font-medium text-sm rounded-lg py-2.5 transition"
            >
              {mode === "login" ? <LogIn size={15} /> : <UserPlus size={15} />}
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={onDemo}
          className="w-full mt-4 flex items-center justify-center gap-1.5 text-sm border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 rounded-lg py-2.5 transition"
        >
          <PlayCircle size={15} /> Try the demo
          <span className="text-xs text-amber-400 ml-1">Simulated data</span>
        </button>
      </div>
    </div>
  );
}

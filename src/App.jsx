import React, { useState, useEffect, useCallback } from "react";
import LoginPage, { fetchAccount, logout } from "./Auth.jsx";
import DemoDashboard from "./DemoDashboard.jsx";
import IndividualApp from "./IndividualApp.jsx";
import ManagerApp from "./ManagerApp.jsx";
import { setUnauthorizedHandler } from "./api.js";
import { Empty } from "./ui.jsx";

/* ---------------- auth gate ---------------- */

export default function App() {
  const [account, setAccount] = useState(null);
  const [checked, setChecked] = useState(false);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");

  const checkSession = useCallback(() => {
    setError("");
    fetchAccount()
      .then((a) => setAccount(a))
      .catch((e) => setError(e.message))
      .finally(() => setChecked(true));
  }, []);

  // On load, ask the server whether the session cookie is still valid
  useEffect(() => {
    checkSession();
    // Any "Unauthorized" answer later on means the session ended: back to the login page
    setUnauthorizedHandler(() => setAccount(null));
    return () => setUnauthorizedHandler(null);
  }, [checkSession]);

  async function handleLogout() {
    try { await logout(); } catch { /* the session is dropped locally either way */ }
    setAccount(null);
  }

  if (!checked) return null;

  if (error && !account && !demo) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center px-6">
        <div className="text-center">
          <Empty>{error}</Empty>
          <button onClick={checkSession} className="text-xs border border-slate-800 hover:border-slate-700 rounded-md px-3 py-1.5 text-slate-300">Try again</button>
        </div>
      </div>
    );
  }

  if (demo) return <DemoDashboard onExit={() => setDemo(false)} />;

  if (!account) {
    return <LoginPage onAuthenticated={setAccount} onDemo={() => setDemo(true)} />;
  }

  if (account.role === "manager") {
    return <ManagerApp account={account} onLogout={handleLogout} />;
  }
  return <IndividualApp account={account} onLogout={handleLogout} onAccountDeleted={() => setAccount(null)} />;
}

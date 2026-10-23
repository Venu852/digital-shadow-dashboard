import { useCallback, useEffect, useState } from "react";

/* Same-origin fetch wrapper. The session lives in the server's HttpOnly cookie;
   nothing about the login is stored in the browser. */

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let unauthorizedHandler = null;

// Called when the server says the session is gone, so the app can show the login page
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export async function api(path, { method = "GET", body } = {}) {
  const options = {
    method,
    credentials: "same-origin",
    headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
  };
  if (method !== "GET") {
    // The server requires a JSON body on every POST/PUT/DELETE
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body ?? {});
  }

  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new ApiError(0, "Can't reach the server.");
  }

  let data = null;
  if (res.status !== 204) {
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status}).`;
    // A wrong password also answers 401, but only "Unauthorized" means the session is gone
    if (res.status === 401 && message === "Unauthorized" && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(res.status, message);
  }
  return data;
}

export const get = (path) => api(path);
export const post = (path, body) => api(path, { method: "POST", body });
export const put = (path, body) => api(path, { method: "PUT", body });
export const del = (path, body) => api(path, { method: "DELETE", body });

// Loads `path` (skipped while it is null) and reloads whenever it changes
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: "", loading: Boolean(path) });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: "", loading: false });
      return;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    get(path)
      .then((data) => { if (live) setState({ data, error: "", loading: false }); })
      .catch((e) => { if (live) setState({ data: null, error: e.message, loading: false }); });
    return () => { live = false; };
  }, [path, tick]);

  return { ...state, reload };
}

import axios from 'axios';

const TOKEN_KEY = 'mop_token';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/*
 * The API runs on a free Render instance, which spins down when idle and takes
 * 30-60 seconds to come back. A 20s timeout meant the first request after a
 * quiet period ALWAYS failed — the user saw "the request timed out", retried,
 * and it worked only because the failed attempt had woken the server.
 *
 * 75s is chosen to sit past the worst observed cold start. It is a ceiling for
 * the pathological case, not a normal wait: a warm request answers in under a
 * second, and `warmUp()` below usually means the server is already awake by
 * the time anyone submits anything.
 *
 * The real fix is a paid always-on instance. This makes the free tier survivable.
 */
export const COLD_START_MS = 75000;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: COLD_START_MS,
});

/*
 * Fire-and-forget ping to wake the backend while someone is still reading the
 * page. Called on public pages, where the visitor typically browses for a
 * while before logging in or sending an enquiry — so by the time they submit,
 * the server has had a head start. Failure is irrelevant and ignored.
 */
export function warmUp() {
  fetch(`${BASE_URL}/health`, { method: 'GET', mode: 'cors', cache: 'no-store' }).catch(() => {});
}

/** Roughly how long before a pending request is worth explaining to the user. */
export const SLOW_REQUEST_MS = 6000;

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Turn any axios failure into a readable string for a toast. */
export function errorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  // FastAPI validation errors arrive as an array of {loc, msg}.
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : '';
    return field ? `${field}: ${first.msg}` : first.msg;
  }
  if (error?.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again in a moment.';
  }
  if (error?.message === 'Network Error') {
    return 'Cannot reach the server. Is the backend running on port 8000?';
  }
  return error?.message || 'Something went wrong.';
}

/** Session-expiry handling lives here so every screen gets it for free.
 *  Registered from AuthContext, which owns the actual logout. */
export function installUnauthorizedHandler(onUnauthorized) {
  const id = api.interceptors.response.use(
    (r) => r,
    (error) => {
      const status = error?.response?.status;
      const url = error?.config?.url || '';
      // Login failures surface inline on the login form; don't treat them as
      // an expired session.
      const isAuthAttempt = url.includes('/auth/login');
      if (status === 401 && !isAuthAttempt) onUnauthorized();
      return Promise.reject(error);
    },
  );
  return () => api.interceptors.response.eject(id);
}

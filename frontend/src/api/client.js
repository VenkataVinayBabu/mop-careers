import axios from 'axios';

const TOKEN_KEY = 'mop_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: 20000,
});

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
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
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

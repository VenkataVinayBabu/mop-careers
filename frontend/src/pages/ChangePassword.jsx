import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { api, errorMessage } from '../api/client';
import Logo from '../components/Logo';
import { HOME_FOR_ROLE } from '../components/ProtectedRoute';
import { useToast } from '../components/Toast';
import { Loading, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';

/** Forced change on first login, and also reachable voluntarily. */
export default function ChangePassword() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ current: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading label="Loading…" />;
  if (!user) return <Navigate to="/login" replace />;

  const forced = user.must_change_password;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', {
        current_password: form.current,
        new_password: form.password,
      });
      const fresh = await refreshUser();
      toast.success('Password updated.');
      navigate(HOME_FOR_ROLE[fresh.role] || '/app', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-navy-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size="lg" />
        </div>

        <div className="card p-6 sm:p-8">
          <h1 className="text-lg font-semibold text-navy">
            {forced ? 'Set your password' : 'Change your password'}
          </h1>
          <p className="mt-1 mb-5 text-sm text-navy-400">
            {forced
              ? 'Before you continue, please replace the temporary password you were given.'
              : 'Choose a new password for your account.'}
          </p>

          <form onSubmit={submit} noValidate>
            <div className="mb-4">
              <label className="label" htmlFor="current">
                {forced ? 'Temporary password' : 'Current password'}
              </label>
              <input
                id="current"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                value={form.current}
                onChange={(e) => setForm({ ...form, current: e.target.value })}
              />
            </div>

            <div className="mb-4">
              <label className="label" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div className="mb-5">
              <label className="label" htmlFor="confirm">
                Confirm new password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700"
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-cta w-full">
              {busy && <Spinner className="h-4 w-4" />}
              {busy ? 'Saving…' : 'Save password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

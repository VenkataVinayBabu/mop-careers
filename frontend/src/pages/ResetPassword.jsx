import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { api, errorMessage } from '../api/client';
import Logo from '../components/Logo';
import { Spinner } from '../components/ui';
import { useToast } from '../components/Toast';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      await api.post('/auth/reset-password', { token, new_password: form.password });
      toast.success('Password reset. You can sign in now.');
      navigate('/login', { replace: true });
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
          <h1 className="text-lg font-semibold text-navy">Choose a new password</h1>

          {!token ? (
            <>
              <p className="mt-2 text-sm text-navy-400">
                This reset link is missing its token. Please request a new one.
              </p>
              <Link to="/forgot-password" className="btn-cta mt-6 w-full">
                Request a new link
              </Link>
            </>
          ) : (
            <form onSubmit={submit} className="mt-5" noValidate>
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
                {busy ? 'Saving…' : 'Reset password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { errorMessage } from '../api/client';
import Logo from '../components/Logo';
import { HOME_FOR_ROLE } from '../components/ProtectedRoute';
import { Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  // Already signed in — bounce to the right home.
  if (user) {
    return <Navigate to={user.must_change_password ? '/change-password' : HOME_FOR_ROLE[user.role]} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await login(form.email.trim(), form.password);
      navigate(
        data.must_change_password ? '/change-password' : HOME_FOR_ROLE[data.user.role] || '/app',
        { replace: true },
      );
    } catch (err) {
      // A blocked account returns 403 with the administration message; show it as-is.
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-navy-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <Logo size="lg" />
          </Link>
          <p className="mt-3 text-sm text-navy-400">Sign in to your learning platform</p>
        </div>

        <div className="card p-6 sm:p-8">
          <form onSubmit={submit} noValidate>
            <div className="mb-4">
              <label className="label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="mb-5">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/forgot-password" className="text-sm font-medium text-teal hover:text-teal-700">
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Accounts are created by MOP staff — there is no self-registration. */}
        <p className="mt-6 text-center text-xs text-navy-400">
          Accounts are issued by MOP Careers. Need access?{' '}
          <Link to="/" className="font-medium text-teal hover:text-teal-700">
            Get in touch
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

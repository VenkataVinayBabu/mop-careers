import { useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../api/client';
import Logo from '../components/Logo';
import { Spinner } from '../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
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
          <Link to="/" className="inline-block">
            <Logo size="lg" />
          </Link>
        </div>

        <div className="card p-6 sm:p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-xl text-teal">
                &#10003;
              </div>
              <h1 className="text-lg font-semibold text-navy">Check your email</h1>
              <p className="mt-2 text-sm text-navy-400">
                If <span className="font-medium text-navy-600">{email}</span> is registered, a
                password reset link is on its way. The link expires in 60 minutes.
              </p>
              <Link to="/login" className="btn-ghost mt-6 w-full">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-navy">Reset your password</h1>
              <p className="mt-1 mb-5 text-sm text-navy-400">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={submit} noValidate>
                <div className="mb-5">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                  {busy ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login" className="text-sm font-medium text-teal hover:text-teal-700">
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

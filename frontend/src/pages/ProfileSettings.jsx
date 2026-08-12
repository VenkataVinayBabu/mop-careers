import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';

import { api, errorMessage } from '../api/client';
import { useToast } from '../components/Toast';
import { PageHeader, Spinner } from '../components/ui';
import { ROLE_LABEL } from '../constants';
import { useAuth } from '../context/AuthContext';

/** Anyone signed in editing their own details — student, teacher, viewer,
 *  contributor or member. Email, role and batch are shown but locked: those
 *  stay with the administration, because email is the login identity and the
 *  other two are what the person is allowed to see. */
export default function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const isStudent = user?.role === 'student';

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    yoe_it: user?.yoe_it ?? '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error('Please enter your full name.');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/auth/me', {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        // Years of experience is a student field; the API ignores it for
        // everyone else, and the input is not shown to them either.
        yoe_it: isStudent && form.yoe_it !== '' ? Number(form.yoe_it) : null,
      });
      await refreshUser();
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Profile settings" subtitle="Your personal details" />

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="card p-5 lg:col-span-2" noValidate>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="p-name">Full name</label>
              <input
                id="p-name"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="p-phone">Phone</label>
                <input
                  id="p-phone"
                  className="input"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              {isStudent && (
                <div>
                  <label className="label" htmlFor="p-yoe">Years of IT experience</label>
                  <input
                    id="p-yoe"
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    className="input"
                    placeholder="0"
                    value={form.yoe_it}
                    onChange={(e) => setForm({ ...form, yoe_it: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-cta mt-6">
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
              Managed by MOP Careers
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-navy-400">Email</dt>
                <dd className="font-medium text-navy">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-navy-400">Role</dt>
                <dd className="font-medium text-navy">{ROLE_LABEL[user?.role] || '—'}</dd>
              </div>
              {isStudent && (
                <div>
                  <dt className="text-navy-400">Batch</dt>
                  <dd className="font-medium text-navy">{user?.batch_name || '—'}</dd>
                </div>
              )}
            </dl>
            <p className="mt-4 text-xs text-navy-400">
              Your email is how you sign in. Ask MOP administration if any of these needs
              changing.
            </p>
          </div>

          <Link to="/change-password" className="card flex items-center gap-3 p-5 transition hover:shadow-lift">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-500">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy">Reset password</p>
              <p className="text-xs text-navy-400">Choose a new password</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

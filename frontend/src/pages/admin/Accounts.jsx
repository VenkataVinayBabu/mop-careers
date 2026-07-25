import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import {
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
  Spinner,
} from '../../components/ui';

const TABS = [
  { key: 'student', label: 'Students' },
  { key: 'teacher', label: 'Teachers' },
];

function CreateUserModal({ role, batches, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    yoe_it: '',
    batch_id: '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters.');
      return;
    }
    if (form.password && form.password.length < 8) {
      toast.error('Temporary password must be at least 8 characters.');
      return;
    }
    if (role === 'student' && !form.batch_id) {
      toast.error('Students must be assigned to a batch.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        role,
        // Left blank, the API generates one and emails it to the account holder.
        password: form.password || null,
      };
      if (role === 'student') {
        body.batch_id = Number(form.batch_id);
        body.yoe_it = form.yoe_it === '' ? null : Number(form.yoe_it);
      }
      await api.post('/admin/users', body);
      toast.success(`${role === 'student' ? 'Student' : 'Teacher'} account created.`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={role === 'student' ? 'New student' : 'New teacher'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-cta">
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>

        {role === 'student' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="batch">
                Batch
              </label>
              <select
                id="batch"
                className="input"
                value={form.batch_id}
                onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
              >
                <option value="">Select a batch…</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="yoe">
                Years of IT experience
              </label>
              <input
                id="yoe"
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
          </div>
        )}

        <div>
          <label className="label" htmlFor="password">
            Temporary password
          </label>
          <input
            id="password"
            className="input"
            placeholder="Leave blank to generate one automatically"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <p className="mt-1 text-xs text-navy-400">
            The account holder is emailed their credentials and must change the password on first
            sign-in.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminAccounts() {
  const toast = useToast();
  const [tab, setTab] = useState('student');
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [u, b] = await Promise.all([api.get('/admin/users'), api.get('/admin/batches')]);
      setUsers(u.data);
      setBatches(b.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const batchName = useMemo(
    () => Object.fromEntries(batches.map((b) => [b.id, b.name])),
    [batches],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => u.role === tab)
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, tab, query]);

  const toggleBlock = async (user) => {
    setBusyId(user.id);
    try {
      const { data } = await api.post(`/admin/users/${user.id}/block`, {
        is_blocked: !user.is_blocked,
      });
      setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
      toast.success(data.is_blocked ? `${data.name} is now blocked.` : `${data.name} is unblocked.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading label="Loading accounts…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="There is no self-registration — every login is created here"
        action={
          <button type="button" onClick={() => setCreating(true)} className="btn-cta">
            New {tab}
          </button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                tab === t.key
                  ? 'bg-navy text-white'
                  : 'border border-navy-200 bg-white text-navy-600 hover:bg-navy-50'
              }`}
            >
              {t.label} ({users.filter((u) => u.role === t.key).length})
            </button>
          ))}
        </div>
        <input
          type="search"
          className="input sm:max-w-xs"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="card">
        {visible.length === 0 ? (
          <EmptyState
            title={query ? 'No matches' : `No ${tab}s yet`}
            message={
              query
                ? 'Try a different search term.'
                : `Create a ${tab} account to get started.`
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-navy-100">
              <thead className="bg-navy-50">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Email</th>
                  <th className="th">Phone</th>
                  {tab === 'student' && <th className="th">Batch</th>}
                  {tab === 'student' && <th className="th">IT exp.</th>}
                  <th className="th">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {visible.map((u) => (
                  <tr key={u.id}>
                    <td className="td font-medium text-navy">{u.name}</td>
                    <td className="td text-navy-400">{u.email}</td>
                    <td className="td text-navy-400">{u.phone || '—'}</td>
                    {tab === 'student' && (
                      <td className="td">{batchName[u.batch_id] || '—'}</td>
                    )}
                    {tab === 'student' && (
                      <td className="td">{u.yoe_it == null ? '—' : `${u.yoe_it} yr`}</td>
                    )}
                    <td className="td">
                      <div className="flex flex-wrap gap-1.5">
                        {u.is_blocked ? (
                          <span className="badge-warn">Blocked</span>
                        ) : (
                          <span className="badge-done">Active</span>
                        )}
                        {u.must_change_password && (
                          <span className="badge-pending">Pending first login</span>
                        )}
                      </div>
                    </td>
                    <td className="td">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => toggleBlock(u)}
                          disabled={busyId === u.id}
                          className={`btn-ghost btn-sm ${u.is_blocked ? '' : 'text-orange'}`}
                        >
                          {busyId === u.id ? '…' : u.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <CreateUserModal
          role={tab}
          batches={batches}
          onClose={() => setCreating(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

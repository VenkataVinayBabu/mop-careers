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
  StatCard,
} from '../../components/ui';
import {
  APPLICATION_STATUS,
  APPLICATION_STATUS_KEYS,
  ROUND_RESULT,
  formatDate,
  formatLpa,
} from '../../constants';

const TABS = [
  { key: 'applications', label: 'Applications' },
  { key: 'companies', label: 'Companies' },
];

const today = () => new Date().toISOString().slice(0, 10);

function StatusBadge({ status }) {
  const s = APPLICATION_STATUS[status] || { label: status, cls: 'badge-pending' };
  return <span className={s.cls}>{s.label}</span>;
}

/* ---------------------------------------------------------------- company */
function CompanyModal({ initial, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState({
    name: initial?.name || '',
    website: initial?.website || '',
    location: initial?.location || '',
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Company name is required.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        website: form.website.trim() || null,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editing) await api.patch(`/admin/placements/companies/${initial.id}`, body);
      else await api.post('/admin/placements/companies', body);
      toast.success(editing ? 'Company updated.' : 'Company added.');
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
      title={editing ? 'Edit company' : 'New company'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-cta">
            {saving && <Spinner className="h-4 w-4" />}
            {editing ? 'Save changes' : 'Add company'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="cname">Company name</label>
          <input id="cname" className="input" value={form.name}
                 onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cloc">Location</label>
            <input id="cloc" className="input" value={form.location}
                   onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="cweb">Website</label>
            <input id="cweb" className="input" placeholder="https://…" value={form.website}
                   onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cnotes">Notes</label>
          <textarea id="cnotes" rows={3} className="input" value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ application */
function ApplicationModal({ initial, students, companies, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState({
    student_id: initial?.student_id || '',
    company_id: initial?.company_id || '',
    role_title: initial?.role_title || '',
    status: initial?.status || 'applied',
    package_lpa: initial?.package_lpa ?? '',
    applied_on: initial?.applied_on || today(),
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editing && (!form.student_id || !form.company_id)) {
      toast.error('Pick both a student and a company.');
      return;
    }
    if (!form.role_title.trim()) {
      toast.error('Role title is required.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        role_title: form.role_title.trim(),
        status: form.status,
        package_lpa: form.package_lpa === '' ? null : Number(form.package_lpa),
        applied_on: form.applied_on || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        await api.patch(`/admin/placements/applications/${initial.id}`, body);
      } else {
        await api.post('/admin/placements/applications', {
          ...body,
          student_id: Number(form.student_id),
          company_id: Number(form.company_id),
        });
      }
      toast.success(editing ? 'Application updated.' : 'Application added.');
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
      title={editing ? 'Edit application' : 'New application'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="btn-cta">
            {saving && <Spinner className="h-4 w-4" />}
            {editing ? 'Save changes' : 'Add application'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {!editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="astudent">Student</label>
              <select id="astudent" className="input" value={form.student_id}
                      onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
                <option value="">Select…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="acompany">Company</label>
              <select id="acompany" className="input" value={form.company_id}
                      onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                <option value="">Select…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="arole">Role title</label>
          <input id="arole" className="input" placeholder="Python Full Stack Developer"
                 value={form.role_title}
                 onChange={(e) => setForm({ ...form, role_title: e.target.value })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="astatus">Status</label>
            <select id="astatus" className="input" value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {APPLICATION_STATUS_KEYS.map((k) => (
                <option key={k} value={k}>{APPLICATION_STATUS[k].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="apkg">Package (LPA)</label>
            <input id="apkg" type="number" min="0" step="0.1" className="input" placeholder="—"
                   value={form.package_lpa}
                   onChange={(e) => setForm({ ...form, package_lpa: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="adate">Applied on</label>
            <input id="adate" type="date" className="input" value={form.applied_on}
                   onChange={(e) => setForm({ ...form, applied_on: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="anotes">Internal notes</label>
          <textarea id="anotes" rows={2} className="input" value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <p className="mt-1 text-xs text-navy-400">Not visible to the student.</p>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- rounds */
function RoundsModal({ application, onClose, onChanged }) {
  const toast = useToast();
  const [rounds, setRounds] = useState(application.rounds || []);
  const [form, setForm] = useState({ round_name: '', scheduled_on: today(), result: 'pending' });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await api.get('/admin/placements/applications', {
      params: { student_id: application.student_id },
    });
    const fresh = data.find((a) => a.id === application.id);
    setRounds(fresh ? fresh.rounds : []);
    onChanged();
  };

  const add = async () => {
    if (!form.round_name.trim()) {
      toast.error('Round name is required.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/placements/applications/${application.id}/rounds`, {
        round_name: form.round_name.trim(),
        scheduled_on: form.scheduled_on || null,
        result: form.result,
      });
      setForm({ round_name: '', scheduled_on: today(), result: 'pending' });
      await refresh();
      toast.success('Round added.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setResult = async (roundId, result) => {
    setBusy(true);
    try {
      await api.patch(`/admin/placements/rounds/${roundId}`, { result });
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (roundId) => {
    setBusy(true);
    try {
      await api.delete(`/admin/placements/rounds/${roundId}`);
      await refresh();
      toast.info('Round removed.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Rounds — ${application.student_name} @ ${application.company_name}`}
      onClose={onClose}
      footer={<button type="button" onClick={onClose} className="btn-ghost">Done</button>}
    >
      <div className="space-y-5">
        {rounds.length === 0 ? (
          <p className="text-sm text-navy-400">No interview rounds recorded yet.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {rounds.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">{r.round_name}</p>
                    <p className="text-xs text-navy-400">
                      {r.scheduled_on ? formatDate(r.scheduled_on) : 'No date'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {Object.keys(ROUND_RESULT).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setResult(r.id, k)}
                        disabled={busy}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                          r.result === k
                            ? 'bg-navy text-white'
                            : 'bg-navy-100 text-navy-500 hover:bg-navy-200'
                        }`}
                      >
                        {ROUND_RESULT[k].label}
                      </button>
                    ))}
                    <button type="button" onClick={() => remove(r.id)} disabled={busy}
                            className="ml-1 text-xs font-semibold text-orange">
                      Remove
                    </button>
                  </div>
                </div>
                {r.feedback && <p className="mt-1 text-xs text-navy-400">{r.feedback}</p>}
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-navy-100 pt-4">
          <p className="label">Add a round</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="input sm:col-span-2" placeholder="Round name, e.g. Technical Round 1"
                   value={form.round_name}
                   onChange={(e) => setForm({ ...form, round_name: e.target.value })} />
            <input type="date" className="input" value={form.scheduled_on}
                   onChange={(e) => setForm({ ...form, scheduled_on: e.target.value })} />
          </div>
          <button type="button" onClick={add} disabled={busy} className="btn-cta mt-3 w-full">
            {busy && <Spinner className="h-4 w-4" />}
            Add round
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------- page */
export default function AdminPlacements() {
  const toast = useToast();
  const [tab, setTab] = useState('applications');
  const [apps, setApps] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [editingApp, setEditingApp] = useState(null);
  const [creatingApp, setCreatingApp] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [roundsFor, setRoundsFor] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const [a, c, s, st] = await Promise.all([
        api.get('/admin/placements/applications'),
        api.get('/admin/placements/companies'),
        api.get('/admin/placements/stats'),
        api.get('/admin/users', { params: { role: 'student' } }),
      ]);
      setApps(a.data);
      setCompanies(c.data);
      setStats(s.data);
      setStudents(st.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overall = stats[0];
  const perBatch = useMemo(() => stats.slice(1), [stats]);

  const visibleApps = useMemo(
    () => apps.filter((a) => !statusFilter || a.status === statusFilter),
    [apps, statusFilter],
  );

  const deleteApp = async (app) => {
    if (!window.confirm(`Delete ${app.student_name}'s application to ${app.company_name}?`)) return;
    try {
      await api.delete(`/admin/placements/applications/${app.id}`);
      toast.success('Application deleted.');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const deleteCompany = async (company) => {
    if (!window.confirm(`Delete ${company.name}?`)) return;
    try {
      await api.delete(`/admin/placements/companies/${company.id}`);
      toast.success('Company deleted.');
      load();
    } catch (err) {
      // Refused if applications still reference it.
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <Loading label="Loading placements…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Placements"
        subtitle="Companies, applications and interview rounds"
        action={
          <button
            type="button"
            onClick={() => (tab === 'companies' ? setCreatingCompany(true) : setCreatingApp(true))}
            className="btn-cta"
          >
            {tab === 'companies' ? 'New company' : 'New application'}
          </button>
        }
      />

      {overall && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Placed" value={overall.placed_count} suffix={`/ ${overall.total_students}`} tone="teal" />
          <StatCard label="Placement rate" value={overall.placed_percent} suffix="%" tone="teal" />
          <StatCard label="Average package" value={overall.average_package == null ? '—' : formatLpa(overall.average_package)} />
          <StatCard label="Highest package" value={overall.highest_package == null ? '—' : formatLpa(overall.highest_package)} tone="orange" />
        </div>
      )}

      {perBatch.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
            By batch
          </h2>
          <div className="card table-wrap">
            <table className="min-w-full divide-y divide-navy-100">
              <thead className="bg-navy-50">
                <tr>
                  <th className="th">Batch</th>
                  <th className="th">Students</th>
                  <th className="th">Placed</th>
                  <th className="th">Rate</th>
                  <th className="th">Avg package</th>
                  <th className="th">Highest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {perBatch.map((s) => (
                  <tr key={s.batch_id}>
                    <td className="td font-medium text-navy">{s.batch_name}</td>
                    <td className="td">{s.total_students}</td>
                    <td className="td">{s.placed_count}</td>
                    <td className="td">
                      <span className={s.placed_percent >= 50 ? 'badge-done' : 'badge-pending'}>
                        {s.placed_percent}%
                      </span>
                    </td>
                    <td className="td">{s.average_package == null ? '—' : formatLpa(s.average_package)}</td>
                    <td className="td">{s.highest_package == null ? '—' : formatLpa(s.highest_package)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
              {t.label} ({t.key === 'companies' ? companies.length : apps.length})
            </button>
          ))}
        </div>
        {tab === 'applications' && (
          <select
            className="input sm:max-w-[12rem]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {APPLICATION_STATUS_KEYS.map((k) => (
              <option key={k} value={k}>{APPLICATION_STATUS[k].label}</option>
            ))}
          </select>
        )}
      </div>

      {tab === 'applications' && (
        <div className="card">
          {visibleApps.length === 0 ? (
            <EmptyState
              title={statusFilter ? 'No matches' : 'No applications yet'}
              message={
                statusFilter
                  ? 'No applications have that status.'
                  : 'Add a company, then log a student application against it.'
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="min-w-full divide-y divide-navy-100">
                <thead className="bg-navy-50">
                  <tr>
                    <th className="th">Student</th>
                    <th className="th">Company</th>
                    <th className="th">Role</th>
                    <th className="th">Status</th>
                    <th className="th">Package</th>
                    <th className="th">Rounds</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {visibleApps.map((a) => (
                    <tr key={a.id}>
                      <td className="td font-medium text-navy">{a.student_name}</td>
                      <td className="td">{a.company_name}</td>
                      <td className="td text-navy-400">{a.role_title}</td>
                      <td className="td"><StatusBadge status={a.status} /></td>
                      <td className="td">{a.package_lpa == null ? '—' : formatLpa(a.package_lpa)}</td>
                      <td className="td">{a.rounds.length}</td>
                      <td className="td">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setRoundsFor(a)} className="btn-ghost btn-sm">
                            Rounds
                          </button>
                          <button type="button" onClick={() => setEditingApp(a)} className="btn-ghost btn-sm">
                            Edit
                          </button>
                          <button type="button" onClick={() => deleteApp(a)} className="btn-ghost btn-sm text-orange">
                            Delete
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
      )}

      {tab === 'companies' && (
        <div className="card">
          {companies.length === 0 ? (
            <EmptyState
              title="No companies yet"
              message="Add the companies you place students with."
              action={
                <button type="button" onClick={() => setCreatingCompany(true)} className="btn-cta">
                  New company
                </button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="min-w-full divide-y divide-navy-100">
                <thead className="bg-navy-50">
                  <tr>
                    <th className="th">Company</th>
                    <th className="th">Location</th>
                    <th className="th">Website</th>
                    <th className="th">Applications</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td className="td font-medium text-navy">{c.name}</td>
                      <td className="td text-navy-400">{c.location || '—'}</td>
                      <td className="td">
                        {c.website ? (
                          <a href={c.website} target="_blank" rel="noopener noreferrer"
                             className="text-teal hover:text-teal-700">
                            Visit
                          </a>
                        ) : '—'}
                      </td>
                      <td className="td">{c.application_count}</td>
                      <td className="td">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingCompany(c)} className="btn-ghost btn-sm">
                            Edit
                          </button>
                          <button type="button" onClick={() => deleteCompany(c)} className="btn-ghost btn-sm text-orange">
                            Delete
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
      )}

      {creatingCompany && <CompanyModal onClose={() => setCreatingCompany(false)} onSaved={load} />}
      {editingCompany && (
        <CompanyModal initial={editingCompany} onClose={() => setEditingCompany(null)} onSaved={load} />
      )}
      {creatingApp && (
        <ApplicationModal students={students} companies={companies}
                          onClose={() => setCreatingApp(false)} onSaved={load} />
      )}
      {editingApp && (
        <ApplicationModal initial={editingApp} students={students} companies={companies}
                          onClose={() => setEditingApp(null)} onSaved={load} />
      )}
      {roundsFor && (
        <RoundsModal application={roundsFor} onClose={() => setRoundsFor(null)} onChanged={load} />
      )}
    </div>
  );
}

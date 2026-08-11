import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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
import { formatDate } from '../../constants';

const BLANK = { name: '', course_type: '', start_date: '', status: 'upcoming' };

// The value the programme picker uses for "none of these" — an empty string
// would be indistinguishable from "nothing chosen yet" on a select.
const OTHER = 'other';

function BatchForm({ initial, programs, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState({
    name: initial?.name || BLANK.name,
    program_id: initial?.program_id ? String(initial.program_id) : editing ? OTHER : '',
    course_type: initial?.course_type || BLANK.course_type,
    start_date: initial?.start_date || '',
    status: initial?.status || BLANK.status,
  });
  const [saving, setSaving] = useState(false);

  const chosen = programs.find((p) => String(p.id) === form.program_id) || null;
  const planned = chosen ? chosen.curriculum.length : 0;

  const save = async () => {
    if (form.name.trim().length < 2) {
      toast.error('Batch name must be at least 2 characters.');
      return;
    }
    if (!form.program_id) {
      toast.error('Pick the programme this batch is running.');
      return;
    }
    if (form.program_id === OTHER && !form.course_type.trim()) {
      toast.error('Give the course a name.');
      return;
    }
    setSaving(true);
    try {
      // With a programme chosen the course name comes from it, so it is left
      // out of the body rather than sent as a second version of the same fact.
      const body = {
        name: form.name.trim(),
        start_date: form.start_date || null,
        status: form.status,
        ...(form.program_id === OTHER
          ? { program_id: null, course_type: form.course_type.trim() }
          : { program_id: Number(form.program_id) }),
      };
      const { data } = editing
        ? await api.patch(`/admin/batches/${initial.id}`, body)
        : await api.post('/admin/batches', body);
      toast.success(
        editing ? 'Batch updated.' : `Batch created with ${data.total_days} class days.`,
      );
      onSaved(data);
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
      title={editing ? 'Edit batch' : 'New batch'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-cta">
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create batch'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Batch name
          </label>
          <input
            id="name"
            className="input"
            placeholder="PFS-2026-JAN"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="program">
            Programme
          </label>
          <select
            id="program"
            className="input"
            value={form.program_id}
            onChange={(e) => setForm({ ...form, program_id: e.target.value })}
          >
            <option value="">Select a programme…</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.total_days} days
              </option>
            ))}
            <option value={OTHER}>Something else — type the name</option>
          </select>
          {form.program_id === OTHER ? (
            <input
              className="input mt-2"
              placeholder="Course name"
              value={form.course_type}
              onChange={(e) => setForm({ ...form, course_type: e.target.value })}
            />
          ) : null}
          {/* What choosing this actually does, said before they click Create
              rather than discovered afterwards in the workspace. */}
          {editing ? (
            <p className="mt-1.5 text-xs text-navy-400">
              Changing this re-labels the batch. Its class days stay exactly as they are —
              they already carry dates, recordings and attendance.
            </p>
          ) : chosen ? (
            <p className="mt-1.5 text-xs text-navy-400">
              Creates {chosen.total_days} class days
              {planned > 0
                ? `, the first ${planned} already filled in from this programme's curriculum.`
                : '. No curriculum has been written for this programme yet, so every day starts as a placeholder for the teacher to fill in.'}
            </p>
          ) : form.program_id === OTHER ? (
            <p className="mt-1.5 text-xs text-navy-400">
              45 placeholder class days, since there is no programme to take a curriculum from.
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="start">
              Start date
            </label>
            <input
              id="start"
              type="date"
              className="input"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AssignTeacherModal({ batch, teachers, onClose, onSaved }) {
  const toast = useToast();
  const [teacherId, setTeacherId] = useState('');
  const [saving, setSaving] = useState(false);

  const assigned = new Set(batch.teachers.map((t) => t.id));
  const available = teachers.filter((t) => !assigned.has(t.id));

  const assign = async () => {
    if (!teacherId) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/admin/batches/${batch.id}/teachers`, {
        teacher_id: Number(teacherId),
      });
      toast.success('Teacher assigned.');
      onSaved(data);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const unassign = async (id) => {
    setSaving(true);
    try {
      const { data } = await api.delete(`/admin/batches/${batch.id}/teachers/${id}`);
      toast.info('Teacher unassigned.');
      onSaved(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={`Teachers — ${batch.name}`} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <span className="label">Currently assigned</span>
          {batch.teachers.length === 0 ? (
            <p className="text-sm text-navy-400">No teachers assigned yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100 rounded-lg border border-navy-200">
              {batch.teachers.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy">{t.name}</p>
                    <p className="truncate text-xs text-navy-400">{t.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unassign(t.id)}
                    disabled={saving}
                    className="btn-ghost btn-sm shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="label" htmlFor="teacher">
            Assign a teacher
          </label>
          {available.length === 0 ? (
            <p className="text-sm text-navy-400">
              Every teacher is already assigned to this batch.
            </p>
          ) : (
            <div className="flex gap-2">
              <select
                id="teacher"
                className="input"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">Select a teacher…</option>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={assign}
                disabled={saving || !teacherId}
                className="btn-cta shrink-0"
              >
                Assign
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function AdminBatches() {
  const toast = useToast();
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [b, t, p] = await Promise.all([
        api.get('/admin/batches'),
        api.get('/admin/users', { params: { role: 'teacher' } }),
        // The catalogue is where curriculum templates live, so it is what a
        // new batch is built from.
        api.get('/admin/website/programs'),
      ]);
      setBatches(b.data);
      setTeachers(t.data);
      setPrograms(p.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (batch) => {
    if (!window.confirm(`Delete batch "${batch.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/batches/${batch.id}`);
      toast.success('Batch deleted.');
      load();
    } catch (err) {
      // The API refuses to delete a batch that still has students.
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <Loading label="Loading batches…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Batches"
        subtitle="A new batch starts from its programme's curriculum template"
        action={
          <button type="button" onClick={() => setCreating(true)} className="btn-cta">
            New batch
          </button>
        }
      />

      {batches.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No batches yet"
            message="Create your first batch to start enrolling students."
            action={
              <button type="button" onClick={() => setCreating(true)} className="btn-cta">
                New batch
              </button>
            }
          />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-navy-100">
              <thead className="bg-navy-50">
                <tr>
                  <th className="th">Batch</th>
                  <th className="th">Starts</th>
                  <th className="th">Status</th>
                  <th className="th">Students</th>
                  <th className="th">Teachers</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="td">
                      <p className="font-semibold text-navy">{b.name}</p>
                      <p className="text-xs text-navy-400">
                        {b.course_type} · {b.total_days} days
                      </p>
                    </td>
                    <td className="td">{formatDate(b.start_date) || '—'}</td>
                    <td className="td">
                      <span className={b.status === 'active' ? 'badge-done' : 'badge-pending'}>
                        {b.status}
                      </span>
                    </td>
                    <td className="td">{b.student_count}</td>
                    <td className="td">
                      {b.teachers.length === 0 ? (
                        <span className="text-navy-300">None</span>
                      ) : (
                        b.teachers.map((t) => t.name).join(', ')
                      )}
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        <Link to={`/teacher/batches/${b.id}`} className="btn-ghost btn-sm">
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={() => setAssigning(b)}
                          className="btn-ghost btn-sm"
                        >
                          Teachers
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(b)}
                          className="btn-ghost btn-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(b)}
                          className="btn-ghost btn-sm text-orange"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creating && (
        <BatchForm programs={programs} onClose={() => setCreating(false)} onSaved={load} />
      )}
      {editing && (
        <BatchForm
          initial={editing}
          programs={programs}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
      {assigning && (
        <AssignTeacherModal
          batch={batches.find((b) => b.id === assigning.id) || assigning}
          teachers={teachers}
          onClose={() => setAssigning(null)}
          onSaved={(updated) => {
            setBatches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            setAssigning(updated);
          }}
        />
      )}
    </div>
  );
}

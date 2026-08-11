import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import {
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
  ProgressBar,
  Spinner,
  StatCard,
} from '../../components/ui';
import { formatDate } from '../../constants';

const TABS = [
  { key: 'days', label: 'Class days' },
  { key: 'students', label: 'Students' },
];

/** Edit one class day: topic, date, recording link, notes PDF, completion. */
function DayEditor({ day, onClose, onSaved }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    topic: day.topic || '',
    description: day.description || '',
    scheduled_date: day.scheduled_date || '',
    recording_url: day.recording_url || '',
    status: day.status,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [current, setCurrent] = useState(day);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/teacher/days/${day.id}`, {
        topic: form.topic.trim(),
        description: form.description.trim() || null,
        // An empty date input must clear the value, not send "".
        scheduled_date: form.scheduled_date || null,
        recording_url: form.recording_url.trim() || null,
        status: form.status,
      });
      toast.success(`Day ${data.day_number} saved.`);
      onSaved(data);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Notes must be a PDF file.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post(`/teacher/days/${day.id}/notes`, body);
      setCurrent(data);
      onSaved(data);
      toast.success('Notes uploaded.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeNotes = async () => {
    setUploading(true);
    try {
      const { data } = await api.delete(`/teacher/days/${day.id}/notes`);
      setCurrent(data);
      onSaved(data);
      toast.info('Notes removed.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open
      title={`Day ${day.day_number}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-cta">
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="topic">
            Topic
          </label>
          <input
            id="topic"
            className="input"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="date">
              Scheduled date
            </label>
            <input
              id="date"
              type="date"
              className="input"
              value={form.scheduled_date}
              onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
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
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="recording">
            Recording link
          </label>
          <input
            id="recording"
            className="input"
            placeholder="https://…"
            value={form.recording_url}
            onChange={(e) => setForm({ ...form, recording_url: e.target.value })}
          />
          <p className="mt-1 text-xs text-navy-400">Must start with http:// or https://</p>
        </div>

        <div>
          <span className="label">Notes PDF</span>
          {current.notes_file ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-navy-200 bg-navy-50 px-3.5 py-2.5">
              <span className="flex-1 truncate text-sm text-navy-700">{current.notes_file}</span>
              <button
                type="button"
                onClick={removeNotes}
                disabled={uploading}
                className="btn-ghost btn-sm"
              >
                Remove
              </button>
            </div>
          ) : (
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              disabled={uploading}
              onChange={(e) => upload(e.target.files?.[0])}
              className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-600"
            />
          )}
          {uploading && <p className="mt-2 text-xs text-teal">Working…</p>}
        </div>
      </div>
    </Modal>
  );
}

/** Present/absent toggles for one class day. */
function AttendancePanel({ day, onClose }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/teacher/days/${day.id}/attendance`);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [day.id]);

  const toggle = (studentId) =>
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, present: !r.present } : r)),
    );

  const setAll = (present) => setRows((prev) => prev.map((r) => ({ ...r, present })));

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/teacher/days/${day.id}/attendance`, {
        entries: rows.map((r) => ({ student_id: r.student_id, present: r.present })),
      });
      toast.success('Attendance saved.');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const presentCount = rows.filter((r) => r.present).length;

  return (
    <Modal
      open
      title={`Attendance — Day ${day.day_number}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || rows.length === 0}
            className="btn-cta"
          >
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save attendance'}
          </button>
        </>
      }
    >
      {loading ? (
        <Loading label="Loading roster…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No students" message="This batch has no students enrolled yet." />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-navy-600">
              {presentCount} of {rows.length} present
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAll(true)} className="btn-ghost btn-sm">
                All present
              </button>
              <button type="button" onClick={() => setAll(false)} className="btn-ghost btn-sm">
                All absent
              </button>
            </div>
          </div>

          <ul className="divide-y divide-navy-100">
            {rows.map((r) => (
              <li key={r.student_id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate text-sm font-medium text-navy-700">
                  {r.student_name}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(r.student_id)}
                  aria-pressed={r.present}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    r.present
                      ? 'bg-teal text-white hover:bg-teal-600'
                      : 'bg-navy-100 text-navy-500 hover:bg-navy-200'
                  }`}
                >
                  {r.present ? 'Present' : 'Absent'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}

export default function BatchWorkspace() {
  const { batchId } = useParams();
  const [tab, setTab] = useState('days');
  const [days, setDays] = useState([]);
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [attendanceFor, setAttendanceFor] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, s, st] = await Promise.all([
        api.get(`/teacher/batches/${batchId}/days`),
        api.get(`/teacher/batches/${batchId}/summary`),
        api.get(`/teacher/batches/${batchId}/students`),
      ]);
      setDays(d.data);
      setSummary(s.data);
      setStudents(st.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  // Patch the edited day in place, then refresh the derived numbers.
  const handleSaved = (updated) => {
    setDays((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    api
      .get(`/teacher/batches/${batchId}/summary`)
      .then((r) => setSummary(r.data))
      .catch(() => {});
  };

  if (loading) return <Loading label="Loading workspace…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <Link to="/teacher" className="mb-3 inline-flex text-sm font-medium text-teal hover:text-teal-700">
        &larr; All batches
      </Link>

      <PageHeader
        title={summary?.batch_name || 'Batch'}
        /* No hardcoded fallback for the length any more: batches differ, and
           guessing 55 would print a wrong number for a moment on every 45-day
           batch. An em dash until the summary lands says nothing false. */
        subtitle={`${summary?.completed_days ?? 0} of ${summary?.total_days ?? '—'} classes completed`}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={summary?.student_count ?? 0} />
        <StatCard
          label="Classes done"
          value={summary?.completed_days ?? 0}
          suffix={`/ ${summary?.total_days ?? '—'}`}
          tone="teal"
        />
        <StatCard
          label="Avg attendance"
          value={summary?.average_attendance ?? 0}
          suffix="%"
          tone={(summary?.average_attendance ?? 0) >= 75 ? 'teal' : 'orange'}
        />
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Progress</p>
          <p className="mt-2 text-3xl font-bold text-navy">
            {Math.round(((summary?.completed_days ?? 0) / (summary?.total_days || 1)) * 100)}
            <span className="text-lg text-navy-300">%</span>
          </p>
          <div className="mt-3">
            <ProgressBar value={summary?.completed_days ?? 0} max={summary?.total_days || 1} />
          </div>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
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
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'days' && (
        <ol className="space-y-3">
          {days.map((day) => (
            <li key={day.id} className="card p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex h-7 min-w-[3.25rem] items-center justify-center rounded-md px-2 text-xs font-bold ${
                        day.status === 'completed'
                          ? 'bg-teal text-white'
                          : 'bg-navy-100 text-navy-500'
                      }`}
                    >
                      Day {day.day_number}
                    </span>
                    {day.scheduled_date && (
                      <span className="text-xs text-navy-400">{formatDate(day.scheduled_date)}</span>
                    )}
                    {day.recording_url && <span className="badge-done">Recording</span>}
                    {day.notes_file && <span className="badge-done">Notes</span>}
                  </div>
                  <h3 className="mt-2 font-semibold text-navy">{day.topic}</h3>
                  {day.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-navy-400">{day.description}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(day)}
                    className="btn-ghost btn-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceFor(day)}
                    className="btn-secondary btn-sm"
                  >
                    Attendance
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {tab === 'students' && (
        <div className="card">
          {students.length === 0 ? (
            <EmptyState
              title="No students"
              message="No students have been enrolled in this batch yet."
            />
          ) : (
            <div className="table-wrap">
              <table className="min-w-full divide-y divide-navy-100">
                <thead className="bg-navy-50">
                  <tr>
                    <th className="th">Student</th>
                    <th className="th">Email</th>
                    <th className="th">Attended</th>
                    <th className="th">Attendance</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {students.map((s) => (
                    <tr key={s.student_id}>
                      <td className="td font-medium text-navy">{s.name}</td>
                      <td className="td text-navy-400">{s.email}</td>
                      <td className="td">
                        {s.classes_attended} / {summary?.completed_days ?? 0}
                      </td>
                      <td className="td">
                        <span
                          className={
                            s.attendance_percent >= 75 ? 'badge-done' : 'badge-warn'
                          }
                        >
                          {s.attendance_percent}%
                        </span>
                      </td>
                      <td className="td">
                        {s.is_blocked ? (
                          <span className="badge-warn">Blocked</span>
                        ) : (
                          <span className="badge-done">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && (
        <DayEditor day={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
      {attendanceFor && (
        <AttendancePanel
          day={attendanceFor}
          onClose={() => {
            setAttendanceFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

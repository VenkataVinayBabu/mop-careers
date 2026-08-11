import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { ErrorState, Loading, PageHeader, StatCard } from '../../components/ui';
import { formatDate } from '../../constants';

/*
 * One batch, read-only: its class days and who is in it.
 *
 * The class-day list answers the two questions a coordinator gets asked —
 * "has that class happened?" and "did the recording go up?" — so the upload
 * state is a visible tick or cross per day rather than something to infer
 * from an empty cell.
 */

function Mark({ ok, missingLabel }) {
  return ok ? (
    <span className="text-sm font-semibold text-teal-ink">Yes</span>
  ) : (
    <span className="text-sm font-semibold text-orange-ink">{missingLabel}</span>
  );
}

export default function ViewerBatchDetail() {
  const { batchId } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('days');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/viewer/batches/${batchId}`);
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading batch…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const { batch, days, students } = data;
  const outstanding = batch.overdue_classes + batch.recordings_missing + batch.notes_missing;

  return (
    <div>
      <Link to="/watch/batches" className="mb-3 inline-flex text-sm font-medium text-teal hover:text-teal-700">
        &larr; All batches
      </Link>

      <PageHeader
        title={batch.name}
        subtitle={`${batch.course_type} · ${batch.classes_taught} of ${batch.total_days} classes taught`}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={batch.student_count} />
        <StatCard label="Classes taught" value={batch.classes_taught} suffix={`/ ${batch.total_days}`} tone="teal" />
        <StatCard label="Needs chasing" value={outstanding} tone={outstanding > 0 ? 'orange' : 'teal'} />
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Teacher</p>
          {batch.teachers.length === 0 ? (
            <p className="mt-2 text-sm font-semibold text-orange-ink">None assigned</p>
          ) : (
            batch.teachers.map((t) => (
              <p key={t.id} className="mt-2 text-sm">
                <span className="font-semibold text-navy">{t.name}</span>
                {t.phone && (
                  <a
                    className="block text-teal-ink hover:underline"
                    href={`tel:${t.phone.replace(/\s/g, '')}`}
                  >
                    {t.phone}
                  </a>
                )}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {[
          ['days', `Class days (${days.length})`],
          ['students', `Students (${students.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={
              tab === id
                ? 'rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white'
                : 'rounded-full bg-navy-50 px-4 py-1.5 text-sm font-medium text-navy-600 transition hover:bg-navy-100'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'days' ? (
        <div className="card">
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-navy-100">
              <thead className="bg-navy-50">
                <tr>
                  <th className="th">Day</th>
                  <th className="th">Scheduled</th>
                  <th className="th">Taught</th>
                  <th className="th">Recording</th>
                  <th className="th">Notes</th>
                  <th className="th">Attended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {days.map((d) => (
                  <tr key={d.day_id}>
                    <td className="td">
                      <p className="font-semibold text-navy">Day {d.day_number}</p>
                      <p className="text-xs text-navy-400">{d.topic}</p>
                    </td>
                    <td className="td whitespace-nowrap">
                      {formatDate(d.scheduled_date) || <span className="text-navy-300">—</span>}
                    </td>
                    <td className="td">
                      <span className={d.status === 'completed' ? 'badge-done' : 'badge-pending'}>
                        {d.status === 'completed' ? 'taught' : 'pending'}
                      </span>
                    </td>
                    <td className="td">
                      {d.status !== 'completed' ? (
                        <span className="text-navy-300">—</span>
                      ) : d.has_recording ? (
                        <a
                          className="text-sm font-semibold text-teal-ink hover:underline"
                          href={d.recording_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      ) : (
                        <Mark ok={false} missingLabel="Missing" />
                      )}
                    </td>
                    <td className="td">
                      {d.status !== 'completed' ? (
                        <span className="text-navy-300">—</span>
                      ) : (
                        <Mark ok={d.has_notes} missingLabel="Missing" />
                      )}
                    </td>
                    <td className="td whitespace-nowrap">
                      {d.status === 'completed' ? (
                        `${d.attended} of ${d.student_count}`
                      ) : (
                        <span className="text-navy-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-navy-100">
              <thead className="bg-navy-50">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Classes attended</th>
                  <th className="th">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {students.map((s) => (
                  <tr key={s.student_id}>
                    <td className="td">
                      <span className="font-medium text-navy">{s.name}</span>
                      {s.is_blocked && (
                        <span className="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-ink">
                          blocked
                        </span>
                      )}
                    </td>
                    <td className="td">
                      {s.classes_attended} of {batch.classes_taught}
                    </td>
                    <td className="td">
                      <span
                        className={
                          s.attendance_percent >= 75
                            ? 'font-semibold text-teal-ink'
                            : 'font-semibold text-orange-ink'
                        }
                      >
                        {s.attendance_percent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

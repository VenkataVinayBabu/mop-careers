import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { formatDate } from '../../constants';

/*
 * Watch > Assignments — is the work actually getting done, and where is it not.
 *
 * Ordered least-complete first, which is the order a viewer works down: the
 * batch where two of twenty have handed in is the call to make, not the one
 * that finished last week.
 *
 * Counts and a batch average only. A viewer chases a batch, not a student —
 * individual results are not in the payload at all.
 */
export default function ViewerAssignments() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/viewer/assignments');
      setRows(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading assignments…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const behind = rows.filter((r) => r.student_count && r.submitted_count < r.student_count);

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle={
          rows.length === 0
            ? 'Set by teachers across every batch'
            : `${behind.length} of ${rows.length} still waiting on someone`
        }
      />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No assignments published"
            message="Once a teacher publishes one, its completion shows up here."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const pct = r.student_count
              ? Math.round((r.submitted_count / r.student_count) * 100)
              : 0;
            const done = r.student_count > 0 && r.submitted_count === r.student_count;
            const noneYet = r.submitted_count === 0 && r.student_count > 0;
            return (
              <li key={r.assignment_id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/watch/batches/${r.batch_id}`}
                        className="text-xs font-semibold uppercase tracking-wide text-teal-ink hover:underline"
                      >
                        {r.batch_name}
                      </Link>
                      <span className="text-xs text-navy-300">Day {r.day_number}</span>
                      {noneYet && (
                        <span className="badge bg-orange-100 text-orange-ink">Nobody yet</span>
                      )}
                      {done && <span className="badge-done">All in</span>}
                    </div>
                    <h3 className="mt-1 font-semibold text-navy">{r.title}</h3>
                    <p className="mt-1 text-sm text-navy-400">
                      {r.average_score !== null
                        ? `Batch average ${r.average_score}%`
                        : 'No scores yet'}
                      {r.due_on && ` · due ${formatDate(r.due_on)}`}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold text-navy">
                      {r.submitted_count}
                      <span className="text-base font-semibold text-navy-300">
                        /{r.student_count}
                      </span>
                    </p>
                    <p className="text-xs text-navy-400">submitted</p>
                    <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-navy-100">
                      <div
                        className={`h-full rounded-full ${done ? 'bg-teal' : 'bg-orange'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > 0 && (
        <p className="mt-6 text-xs text-navy-400">
          Counts only — who scored what is between the student and their teacher.
        </p>
      )}
    </div>
  );
}

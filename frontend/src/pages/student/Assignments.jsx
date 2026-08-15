import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { formatDate } from '../../constants';

/** Every published assignment for the student's batch, with their own result.
 *  Unattempted ones first — this list is a to-do, not an archive. */
export default function StudentAssignments() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/student/assignments');
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

  const todo = rows.filter((r) => !r.submitted);
  const done = rows.filter((r) => r.submitted);

  const card = (a) => {
    const percent = a.submitted && a.total ? Math.round((a.score / a.total) * 100) : null;
    return (
      <li key={a.id} className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-ink">
              Day {a.day_number} · {a.day_topic}
            </p>
            <h3 className="mt-1 font-semibold text-navy">{a.title}</h3>
            <p className="mt-1 text-sm text-navy-400">
              {a.question_count} question{a.question_count === 1 ? '' : 's'}
              {a.due_on && ` · due ${formatDate(a.due_on)}`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {a.submitted ? (
              <>
                <div className="text-right">
                  <p className="text-2xl font-bold text-navy">
                    {a.score}
                    <span className="text-base font-semibold text-navy-300">/{a.total}</span>
                  </p>
                  <p className="text-xs text-navy-400">{percent}%</p>
                </div>
                <Link to={`/app/assignments/${a.id}`} className="btn-ghost btn-sm">
                  Review
                </Link>
              </>
            ) : (
              <Link to={`/app/assignments/${a.id}`} className="btn-cta">
                Start &rarr;
              </Link>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle={
          rows.length === 0
            ? 'Set by your teacher'
            : `${done.length} of ${rows.length} completed`
        }
      />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Nothing set yet"
            message="Assignments your teacher sets will appear here."
          />
        </div>
      ) : (
        <div className="space-y-8">
          {todo.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
                To do
              </h2>
              <ul className="space-y-3">{todo.map(card)}</ul>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
                Completed
              </h2>
              <ul className="space-y-3">{done.map(card)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

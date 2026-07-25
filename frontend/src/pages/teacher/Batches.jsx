import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { formatDate } from '../../constants';

export default function TeacherBatches() {
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/teacher/batches');
      setBatches(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading your batches…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="My batches" subtitle="Batches assigned to you" />

      {batches.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No batches assigned"
            message="You have not been assigned to a batch yet. An administrator can assign one to you."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {batches.map((b) => (
            <Link
              key={b.id}
              to={`/teacher/batches/${b.id}`}
              className="card p-5 transition hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-navy">{b.name}</h3>
                  <p className="mt-0.5 text-sm text-navy-400">{b.course_type}</p>
                </div>
                <span className={b.status === 'active' ? 'badge-done' : 'badge-pending'}>
                  {b.status}
                </span>
              </div>
              <dl className="mt-4 flex gap-6 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Students</dt>
                  <dd className="mt-0.5 font-semibold text-navy">{b.student_count}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Starts</dt>
                  <dd className="mt-0.5 font-semibold text-navy">
                    {formatDate(b.start_date) || '—'}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm font-semibold text-teal">Open workspace &rarr;</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

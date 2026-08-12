import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { formatDate } from '../../constants';

/*
 * Every batch, read-only. A viewer is not scoped to any of them — that is the
 * difference between this and the teacher's "My batches".
 *
 * The outstanding counts are on the row rather than only on the follow-ups
 * screen, so a viewer asked "how is the Java batch doing?" can answer
 * without cross-referencing two pages.
 */

function Outstanding({ batch }) {
  const bits = [
    ['not marked taught', batch.overdue_classes],
    ['no recording', batch.recordings_missing],
    ['no notes', batch.notes_missing],
  ].filter(([, n]) => n > 0);

  if (bits.length === 0) {
    return <span className="text-sm font-medium text-teal-ink">Up to date</span>;
  }
  return (
    <span className="text-sm font-medium text-orange-ink">
      {bits.map(([label, n]) => `${n} ${label}`).join(' · ')}
    </span>
  );
}

export default function ViewerBatches() {
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/viewer/batches');
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

  if (loading) return <Loading label="Loading batches…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="All batches" subtitle="Every batch MOP is running" />

      {batches.length === 0 ? (
        <div className="card">
          <EmptyState title="No batches yet" message="Nothing has been set up for you to watch." />
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
                  <th className="th">Classes taught</th>
                  <th className="th">Teacher</th>
                  <th className="th">Outstanding</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {batches.map((b) => (
                  <tr key={b.batch_id}>
                    <td className="td">
                      <p className="font-semibold text-navy">{b.name}</p>
                      <p className="text-xs text-navy-400">{b.course_type}</p>
                    </td>
                    <td className="td whitespace-nowrap">{formatDate(b.start_date) || '—'}</td>
                    <td className="td">
                      <span className={b.status === 'active' ? 'badge-done' : 'badge-pending'}>
                        {b.status}
                      </span>
                    </td>
                    <td className="td">{b.student_count}</td>
                    <td className="td whitespace-nowrap">
                      {b.classes_taught} / {b.total_days}
                    </td>
                    <td className="td">
                      {b.teachers.length === 0 ? (
                        <span className="text-orange-ink">None assigned</span>
                      ) : (
                        <div className="space-y-0.5">
                          {b.teachers.map((t) => (
                            <p key={t.id} className="whitespace-nowrap text-sm">
                              <span className="font-medium text-navy-700">{t.name}</span>
                              {t.phone && (
                                <a
                                  className="ml-2 text-xs text-teal-ink hover:underline"
                                  href={`tel:${t.phone.replace(/\s/g, '')}`}
                                >
                                  {t.phone}
                                </a>
                              )}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="td">
                      <Outstanding batch={b} />
                    </td>
                    <td className="td">
                      <div className="flex justify-end">
                        <Link to={`/watch/batches/${b.batch_id}`} className="btn-ghost btn-sm">
                          Open
                        </Link>
                      </div>
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

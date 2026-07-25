import { useCallback, useEffect, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { formatDate } from '../../constants';

export default function StudentSchedule() {
  const [days, setDays] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/student/schedule');
      setDays(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading your schedule…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const dated = days.filter((d) => d.scheduled_date);
  const undated = days.filter((d) => !d.scheduled_date);

  return (
    <div>
      <PageHeader title="Schedule" subtitle="Your upcoming classes" />

      {days.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No upcoming classes"
            message="Every class has been completed, or your batch has not been scheduled yet."
          />
        </div>
      ) : (
        <>
          {dated.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
                Scheduled
              </h2>
              <ul className="space-y-3">
                {dated.map((day) => (
                  <li key={day.id} className="card p-4 sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="badge-pending">Day {day.day_number}</span>
                          <span className="text-sm font-semibold text-teal">
                            {formatDate(day.scheduled_date)}
                          </span>
                        </div>
                        <h3 className="mt-2 font-semibold text-navy">{day.topic}</h3>
                        {day.description && (
                          <p className="mt-1 text-sm text-navy-400">{day.description}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {undated.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
                Dates to be announced ({undated.length})
              </h2>
              <div className="card divide-y divide-navy-100">
                {undated.map((day) => (
                  <div key={day.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="badge-pending shrink-0">Day {day.day_number}</span>
                    <span className="truncate text-sm text-navy-700">{day.topic}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

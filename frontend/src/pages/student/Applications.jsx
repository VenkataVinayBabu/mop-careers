import { useCallback, useEffect, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { APPLICATION_STATUS, ROUND_RESULT, formatDate, formatLpa } from '../../constants';

/** Read-only. Placement records are maintained by MOP staff. */
export default function StudentApplications() {
  const [apps, setApps] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/student/applications');
      setApps(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading your applications…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const offers = apps.filter((a) => a.status === 'offered' || a.status === 'joined');

  return (
    <div>
      <PageHeader
        title="My applications"
        subtitle={
          apps.length
            ? `${apps.length} application${apps.length === 1 ? '' : 's'}${
                offers.length ? ` · ${offers.length} offer${offers.length === 1 ? '' : 's'}` : ''
              }`
            : 'Your placement activity'
        }
      />

      {apps.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No applications yet"
            message="Once MOP Careers starts putting you forward for roles, they'll appear here."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {apps.map((a) => {
            const s = APPLICATION_STATUS[a.status] || { label: a.status, cls: 'badge-pending' };
            const placed = a.status === 'offered' || a.status === 'joined';
            return (
              <li
                key={a.id}
                className={`card p-4 sm:p-5 ${placed ? 'border-l-4 border-l-teal' : ''}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={s.cls}>{s.label}</span>
                      {a.applied_on && (
                        <span className="text-xs text-navy-400">
                          Applied {formatDate(a.applied_on)}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-semibold text-navy">{a.company_name}</h3>
                    <p className="text-sm text-navy-500">{a.role_title}</p>
                  </div>

                  {a.package_lpa != null && (
                    <div className="shrink-0 sm:text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                        Package
                      </p>
                      <p className="text-lg font-bold text-teal">{formatLpa(a.package_lpa)}</p>
                    </div>
                  )}
                </div>

                {a.rounds.length > 0 && (
                  <div className="mt-4 border-t border-navy-100 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Interview rounds
                    </p>
                    <ul className="space-y-2">
                      {a.rounds.map((r) => {
                        const rr = ROUND_RESULT[r.result] || {
                          label: r.result,
                          cls: 'badge-pending',
                        };
                        return (
                          <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                            <span className={rr.cls}>{rr.label}</span>
                            <span className="font-medium text-navy-700">{r.round_name}</span>
                            {r.scheduled_on && (
                              <span className="text-xs text-navy-400">
                                {formatDate(r.scheduled_on)}
                              </span>
                            )}
                            {r.feedback && (
                              <span className="w-full text-xs text-navy-400">{r.feedback}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

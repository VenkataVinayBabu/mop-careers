import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { EmptyState, ErrorState, Loading, PageHeader, StatCard } from '../../components/ui';
import { DOUBT_STATUS, DOUBT_TYPES, formatDateTime } from '../../constants';
import { useAuth } from '../../context/AuthContext';

/** Shared by admins and teachers. The API scopes teachers to their own
 *  batches, so this component needs no role logic of its own. */
export default function DoubtsInbox() {
  const toast = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('open');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/doubts');
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

  const openCount = rows.filter((r) => r.status === 'open').length;
  const visible = useMemo(
    () => rows.filter((r) => !filter || r.status === filter),
    [rows, filter],
  );

  const setStatus = async (doubt, status) => {
    setBusyId(doubt.id);
    try {
      const { data } = await api.patch(`/doubts/${doubt.id}`, { status });
      setRows((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      toast.success(status === 'answered' ? 'Marked answered.' : 'Reopened.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading label="Loading doubts…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Doubt support"
        subtitle={
          user?.role === 'teacher'
            ? 'Queries from students in your batches'
            : 'Queries raised by students'
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Open" value={openCount} tone={openCount > 0 ? 'orange' : 'teal'} />
        <StatCard label="Answered" value={rows.length - openCount} tone="teal" />
        <StatCard label="Total" value={rows.length} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { key: 'open', label: `Open (${openCount})` },
          { key: 'answered', label: `Answered (${rows.length - openCount})` },
          { key: '', label: `All (${rows.length})` },
        ].map((f) => (
          <button
            key={f.key || 'all'}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              filter === f.key
                ? 'bg-navy text-white'
                : 'border border-navy-200 bg-white text-navy-600 hover:bg-navy-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            title={filter === 'open' ? 'Nothing outstanding' : 'No doubts'}
            message={
              filter === 'open'
                ? 'Every query has been answered.'
                : 'Student queries will appear here as they are raised.'
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((d) => {
            const st = DOUBT_STATUS[d.status] || { label: d.status, cls: 'badge-pending' };
            const ty = DOUBT_TYPES[d.query_type] || { label: d.query_type };
            return (
              <li
                key={d.id}
                className={`card p-4 sm:p-5 ${d.status === 'open' ? 'border-l-4 border-l-orange' : ''}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={st.cls}>{st.label}</span>
                      <span className="badge-pending">{ty.label}</span>
                      {d.related_day && (
                        <span className="text-xs font-medium text-teal">
                          Day {d.related_day}
                          {d.day_topic ? ` — ${d.day_topic}` : ''}
                        </span>
                      )}
                      <span className="text-xs text-navy-400">
                        {formatDateTime(d.created_at)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-navy">
                      {d.student_name}
                      {d.batch_name && (
                        <span className="ml-2 font-normal text-navy-400">{d.batch_name}</span>
                      )}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-navy-700">
                      {d.description}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {d.status === 'open' ? (
                      <button
                        type="button"
                        onClick={() => setStatus(d, 'answered')}
                        disabled={busyId === d.id}
                        className="btn-secondary btn-sm"
                      >
                        {busyId === d.id ? '…' : 'Mark answered'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStatus(d, 'open')}
                        disabled={busyId === d.id}
                        className="btn-ghost btn-sm"
                      >
                        {busyId === d.id ? '…' : 'Reopen'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

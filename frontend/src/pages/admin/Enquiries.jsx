import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import {
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  StatCard,
} from '../../components/ui';
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_CLS, formatDateTime } from '../../constants';

export default function AdminEnquiries() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/admin/enquiries');
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

  const counts = useMemo(() => {
    const c = Object.fromEntries(ENQUIRY_STATUSES.map((s) => [s, 0]));
    rows.forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
    });
    return c;
  }, [rows]);

  const visible = useMemo(
    () => rows.filter((r) => !filter || r.status === filter),
    [rows, filter],
  );

  const setStatus = async (enquiry, status) => {
    setBusyId(enquiry.id);
    try {
      const { data } = await api.patch(`/admin/enquiries/${enquiry.id}`, { status });
      setRows((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      toast.success(`${data.name} marked ${status}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (enquiry) => {
    if (!window.confirm(`Delete the enquiry from ${enquiry.name}?`)) return;
    setBusyId(enquiry.id);
    try {
      await api.delete(`/admin/enquiries/${enquiry.id}`);
      setRows((prev) => prev.filter((r) => r.id !== enquiry.id));
      toast.info('Enquiry deleted.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading label="Loading enquiries…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Enquiries" subtitle="Submitted from the public website" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="New" value={counts.New} tone={counts.New > 0 ? 'orange' : 'navy'} />
        <StatCard label="Contacted" value={counts.Contacted} />
        <StatCard label="Converted" value={counts.Converted} tone="teal" />
        <StatCard label="Closed" value={counts.Closed} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('')}
          className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
            filter === ''
              ? 'bg-navy text-white'
              : 'border border-navy-200 bg-white text-navy-600 hover:bg-navy-50'
          }`}
        >
          All ({rows.length})
        </button>
        {ENQUIRY_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              filter === s
                ? 'bg-navy text-white'
                : 'border border-navy-200 bg-white text-navy-600 hover:bg-navy-50'
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            title={filter ? `No ${filter} enquiries` : 'No enquiries yet'}
            message={
              filter
                ? 'Try a different status filter.'
                : 'Enquiries submitted through the public site will appear here.'
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((e) => (
            <li key={e.id} className="card p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={ENQUIRY_STATUS_CLS[e.status] || 'badge-pending'}>
                      {e.status}
                    </span>
                    <span className="text-xs text-navy-400">{formatDateTime(e.created_at)}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-navy">{e.name}</h3>
                  <p className="text-sm text-navy-500">
                    <a href={`mailto:${e.email}`} className="text-teal hover:text-teal-700">
                      {e.email}
                    </a>
                    {' · '}
                    <a href={`tel:${e.phone}`} className="text-teal hover:text-teal-700">
                      {e.phone}
                    </a>
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-navy-700">{e.message}</p>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                  <select
                    className="input"
                    value={e.status}
                    disabled={busyId === e.id}
                    onChange={(ev) => setStatus(e, ev.target.value)}
                    aria-label={`Status for ${e.name}`}
                  >
                    {ENQUIRY_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(e)}
                    disabled={busyId === e.id}
                    className="btn-ghost btn-sm text-orange"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

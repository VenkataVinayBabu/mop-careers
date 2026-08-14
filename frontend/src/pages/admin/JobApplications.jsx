import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { formatDateTime } from '../../constants';

/** Applications submitted from the careers page. Read by the whole back
 *  office; only a member or admin can delete one. */
export default function JobApplications() {
  const toast = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState('');
  const [open, setOpen] = useState(null);   // which row's cover letter is expanded
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const canDelete = user?.role === 'admin' || user?.role === 'member';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/job-applications');
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

  /* Built from what has actually been applied for rather than the openings in
     the careers page, so a role taken down still filters the applications it
     brought in. */
  const positions = useMemo(
    () => [...new Set(rows.map((r) => r.position))].sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !position || r.position === position)
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.includes(q),
      );
  }, [rows, query, position]);

  const remove = async (row) => {
    setBusyId(row.id);
    try {
      await api.delete(`/admin/job-applications/${row.id}`);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success(`${row.name}'s application removed.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading label="Loading applications…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Job applications"
        subtitle={`${rows.length} received through the careers page`}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          className="input sm:max-w-xs"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          <option value="">All positions</option>
          {positions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          type="search"
          className="input sm:max-w-xs"
          placeholder="Search name, email or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            title={rows.length === 0 ? 'No applications yet' : 'No matches'}
            message={
              rows.length === 0
                ? 'Applications submitted from the careers page will appear here.'
                : 'Try a different search or position.'
            }
          />
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{r.name}</p>
                  <p className="mt-0.5 text-sm text-navy-400">
                    {r.position} · {r.years_experience} experience
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-navy-300">{formatDateTime(r.created_at)}</span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      disabled={busyId === r.id}
                      className="btn-ghost btn-sm text-orange"
                    >
                      {busyId === r.id ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>

              {/* Email and phone are links: on a phone that is one tap rather
                  than copying an address out by hand. */}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <a href={`mailto:${r.email}`} className="font-medium text-teal hover:underline">
                  {r.email}
                </a>
                <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="text-navy-500 hover:underline">
                  {r.phone}
                </a>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {/* The resume is the point of the row, so it gets the solid
                    button. It opens in a new tab — losing this list to a
                    Google Drive page would mean reloading it every time. */}
                <a
                  href={r.resume_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-ghost btn-sm border border-navy-200"
                >
                  Open resume &rarr;
                </a>
                {r.portfolio_url && (
                  <a
                    href={r.portfolio_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-ghost btn-sm border border-navy-200"
                  >
                    Portfolio &rarr;
                  </a>
                )}
                {r.cover_letter && (
                  <button
                    type="button"
                    onClick={() => setOpen(open === r.id ? null : r.id)}
                    className="btn-ghost btn-sm"
                  >
                    {open === r.id ? 'Hide cover letter' : 'Cover letter'}
                  </button>
                )}
              </div>

              {open === r.id && r.cover_letter && (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-navy-50 p-3.5 text-sm text-navy-600">
                  {r.cover_letter}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Said once, at the bottom, rather than on every row. */}
      {rows.length > 0 && (
        <p className="mt-6 text-xs text-navy-400">
          Resumes are links the applicant supplied, not files we hold — if one will not open,
          their sharing settings are the likely cause, and the link may stop working if they
          later revoke access.
        </p>
      )}
    </div>
  );
}

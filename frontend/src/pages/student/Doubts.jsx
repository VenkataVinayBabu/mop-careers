import { useCallback, useEffect, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { EmptyState, ErrorState, Loading, PageHeader, Spinner } from '../../components/ui';
import { DOUBT_STATUS, DOUBT_TYPES, formatDateTime } from '../../constants';

export default function StudentDoubts() {
  const toast = useToast();
  const [doubts, setDoubts] = useState([]);
  const [form, setForm] = useState({ query_type: 'class_doubt', related_day: '', description: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/doubts/mine');
      setDoubts(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.description.trim().length < 5) {
      toast.error('Please describe your doubt in a little more detail.');
      return;
    }
    setSending(true);
    try {
      await api.post('/doubts', {
        query_type: form.query_type,
        // Only class doubts carry a day number.
        related_day:
          form.query_type === 'class_doubt' && form.related_day
            ? Number(form.related_day)
            : null,
        description: form.description.trim(),
      });
      setForm({ query_type: 'class_doubt', related_day: '', description: '' });
      toast.success('Your doubt has been sent.');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loading label="Loading your queries…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const openCount = doubts.filter((d) => d.status === 'open').length;

  return (
    <div>
      <PageHeader
        title="Doubt support"
        subtitle="Ask your instructor or the MOP team — we'll get back to you by email"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ---------------------------------------------------- ask form */}
        <form onSubmit={submit} className="card h-fit p-5 lg:col-span-2" noValidate>
          <h2 className="font-semibold text-navy">Ask a doubt</h2>

          <div className="mt-4">
            <label className="label" htmlFor="qtype">Type of query</label>
            <select
              id="qtype"
              className="input"
              value={form.query_type}
              onChange={(e) => setForm({ ...form, query_type: e.target.value })}
            >
              {Object.entries(DOUBT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-navy-400">
              {DOUBT_TYPES[form.query_type]?.hint}
            </p>
          </div>

          {form.query_type === 'class_doubt' && (
            <div className="mt-4">
              <label className="label" htmlFor="day">Related day (optional)</label>
              <input
                id="day"
                type="number"
                min="1"
                max="55"
                className="input"
                placeholder="e.g. 9"
                value={form.related_day}
                onChange={(e) => setForm({ ...form, related_day: e.target.value })}
              />
            </div>
          )}

          <div className="mt-4">
            <label className="label" htmlFor="desc">Your question</label>
            <textarea
              id="desc"
              rows={5}
              className="input"
              placeholder="Describe what you're stuck on…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <button type="submit" disabled={sending} className="btn-cta mt-5 w-full">
            {sending && <Spinner className="h-4 w-4" />}
            {sending ? 'Sending…' : 'Send doubt'}
          </button>
        </form>

        {/* -------------------------------------------------- my queries */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-400">
              My queries
            </h2>
            {doubts.length > 0 && (
              <span className="text-xs text-navy-400">
                {openCount} open · {doubts.length - openCount} answered
              </span>
            )}
          </div>

          {doubts.length === 0 ? (
            <div className="card">
              <EmptyState
                title="No queries yet"
                message="Anything you ask will appear here so you can track whether it's been answered."
              />
            </div>
          ) : (
            <ul className="space-y-3">
              {doubts.map((d) => {
                const st = DOUBT_STATUS[d.status] || { label: d.status, cls: 'badge-pending' };
                const ty = DOUBT_TYPES[d.query_type] || { label: d.query_type };
                return (
                  <li key={d.id} className="card p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={st.cls}>{st.label}</span>
                      <span className="badge-pending">{ty.label}</span>
                      {d.related_day && (
                        <span className="text-xs font-medium text-teal">
                          Day {d.related_day}
                          {d.day_topic ? ` — ${d.day_topic}` : ''}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-navy-400">
                        {formatDateTime(d.created_at)}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-navy-700">
                      {d.description}
                    </p>
                    {d.status === 'answered' && d.answered_at && (
                      <p className="mt-2 text-xs text-teal">
                        Marked answered {formatDateTime(d.answered_at)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

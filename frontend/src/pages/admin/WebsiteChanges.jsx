import { useCallback, useEffect, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, ErrorState, Loading, Modal, PageHeader, Spinner } from '../../components/ui';
import WebsiteTabs from './WebsiteTabs';

/*
 * Two screens, one file, because they are the same list read from opposite
 * ends: a member's queue of things to approve, and a contributor's list of
 * what they have sent and what came back.
 *
 * The important thing both must convey is that a proposal has NOT happened
 * yet. Everywhere else in this admin area, seeing a value on screen means the
 * public site shows it; here it means somebody would like it to.
 */

const STATUS_STYLE = {
  pending: 'bg-orange-50 text-orange-ink',
  approved: 'bg-teal-50 text-teal-ink',
  rejected: 'bg-navy-100 text-navy-700',
  withdrawn: 'bg-navy-50 text-navy-500',
};

const STATUS_LABEL = {
  pending: 'Waiting for approval',
  approved: 'Live on the site',
  rejected: 'Sent back',
  withdrawn: 'Withdrawn',
};

function when(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${d
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()}`;
}

/** What is actually being proposed, field by field.
 *
 *  Deliberately the raw values rather than a prose summary: a member approving
 *  a change to the fee figures needs to see the figures, and any description
 *  I could generate would be a paraphrase of the thing they are signing off. */
function ProposedValues({ change }) {
  const entries = Object.entries(change.payload || {});

  if (change.action === 'delete') {
    return <p className="text-sm font-medium text-orange-ink">Removes this from the website.</p>;
  }
  if (change.action === 'reorder') {
    return <p className="text-sm text-navy-600">Changes the order things appear in.</p>;
  }
  if (entries.length === 0) {
    return <p className="text-sm text-navy-400">No values.</p>;
  }

  return (
    <dl className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
          <dt className="text-xs font-semibold uppercase tracking-wide text-navy-400">{key}</dt>
          <dd className="min-w-0 break-words text-sm text-navy-700">
            {typeof value === 'object' && value !== null ? (
              <pre className="overflow-x-auto rounded bg-navy-50 p-2 text-xs">
                {JSON.stringify(value, null, 1)}
              </pre>
            ) : (
              String(value === '' ? '(blank)' : value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RejectModal({ change, onClose, onDone }) {
  const toast = useToast();
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const send = async () => {
    if (!feedback.trim()) {
      toast.error('Say what needs changing — that is the whole point of sending it back.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/admin/website/changes/${change.id}/reject`, { feedback: feedback.trim() });
      toast.info('Sent back with your note.');
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Send this back"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="button" onClick={send} disabled={saving} className="btn-cta">
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Sending…' : 'Send back'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-navy-600">{change.summary}</p>
        <div>
          <label className="label" htmlFor="feedback">What needs changing?</label>
          <textarea
            id="feedback"
            className="input"
            rows={4}
            maxLength={2000}
            placeholder="The fee figure is out of date — check the current one with Bala first."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-navy-400">
            {change.submitted_by_name} sees this, so write it to them.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminWebsiteChanges({ mine = false }) {
  const toast = useToast();
  const { user } = useAuth();
  const [changes, setChanges] = useState([]);
  const [rejecting, setRejecting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const canReview = user?.role === 'member' || user?.role === 'admin';

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/admin/website/changes');
      setChanges(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (change) => {
    setBusyId(change.id);
    try {
      await api.post(`/admin/website/changes/${change.id}/approve`, {});
      toast.success('Approved. It is on the public site now.');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const withdraw = async (change) => {
    if (!window.confirm('Take this back? It will not be reviewed.')) return;
    setBusyId(change.id);
    try {
      await api.post(`/admin/website/changes/${change.id}/withdraw`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading label="Loading changes…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const pending = changes.filter((c) => c.status === 'pending');
  const settled = changes.filter((c) => c.status !== 'pending');

  return (
    <div>
      <WebsiteTabs />
      <PageHeader
        title={mine ? 'My changes' : 'Approvals'}
        subtitle={
          mine
            ? 'What you have sent for approval, and what came back'
            : `${pending.length} waiting for you`
        }
        action={
          <button type="button" onClick={load} className="btn-ghost btn-sm">Refresh</button>
        }
      />

      {changes.length === 0 ? (
        <div className="card">
          <EmptyState
            title={mine ? 'You have not sent anything yet' : 'Nothing waiting'}
            message={
              mine
                ? 'Edit anything under Website and it will appear here until a member approves it.'
                : 'When a contributor edits the website, their changes queue up here for you.'
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-400">
                Waiting
              </h2>
              <ul className="space-y-3">
                {pending.map((c) => (
                  <li key={c.id} className="card border-l-4 border-l-orange p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-navy">{c.summary}</p>
                        <p className="mt-0.5 text-xs text-navy-400">
                          {c.submitted_by_name} · {when(c.submitted_at)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>

                    <div className="mt-4 rounded-lg bg-navy-50/60 p-3.5">
                      <ProposedValues change={c} />
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {canReview ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setRejecting(c)}
                            disabled={busyId === c.id}
                            className="btn-ghost btn-sm"
                          >
                            Send back
                          </button>
                          <button
                            type="button"
                            onClick={() => approve(c)}
                            disabled={busyId === c.id}
                            className="btn-cta btn-sm"
                          >
                            {busyId === c.id ? 'Publishing…' : 'Approve and publish'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => withdraw(c)}
                          disabled={busyId === c.id}
                          className="btn-ghost btn-sm"
                        >
                          Take it back
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {settled.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-400">
                Settled
              </h2>
              <ul className="space-y-2">
                {settled.map((c) => (
                  <li key={c.id} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy">{c.summary}</p>
                        <p className="mt-0.5 text-xs text-navy-400">
                          {c.submitted_by_name} · {when(c.submitted_at)}
                          {c.reviewed_by_name && ` · ${c.status} by ${c.reviewed_by_name}`}
                        </p>
                        {c.feedback && (
                          <p className="mt-2 rounded-lg bg-navy-50 p-2.5 text-sm text-navy-700">
                            <span className="font-semibold">Feedback:</span> {c.feedback}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {rejecting && (
        <RejectModal change={rejecting} onClose={() => setRejecting(null)} onDone={load} />
      )}
    </div>
  );
}

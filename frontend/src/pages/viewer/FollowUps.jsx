import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import {
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
  Spinner,
  StatCard,
} from '../../components/ui';
import { formatDate } from '../../constants';

/*
 * The viewer's home screen, and the reason the role exists.
 *
 * A viewer is not here to browse â€” they are here to find out who has not
 * uploaded a recording and ring them. So this is a worklist, not a dashboard:
 * every outstanding item, oldest first, each one already carrying the phone
 * number of the person to call.
 *
 * The one thing on this screen that writes is "I called them", and it is
 * deliberately not a "mark as done": the item stays until the file actually
 * turns up, and simply gains "chased twice, still nothing". A button that made
 * the row disappear would let this screen say "all clear" while a student
 * still had no recording â€” the list is a mirror of the class records, and its
 * whole value is that it cannot be wrong.
 *
 * Closing happens by itself, and the trail lives under Closed.
 */

const KINDS = [
  { id: '', label: 'Everything' },
  { id: 'not_taught', label: 'Not marked taught' },
  { id: 'no_recording', label: 'No recording' },
  { id: 'no_notes', label: 'No notes' },
];

/* Written out rather than interpolated â€” Tailwind scans source text, so a
   class built from a variable is never generated. Same trap as the missing
   navy-500 ramp and `text-${tone}` on the programme editor. */
const KIND_BADGE = {
  not_taught: 'bg-orange-50 text-orange-ink',
  no_recording: 'bg-navy-50 text-navy-700',
  no_notes: 'bg-navy-50 text-navy-700',
};

const KIND_LABEL = {
  not_taught: 'Not marked taught',
  no_recording: 'No recording',
  no_notes: 'No notes',
};

/** "18 Aug, 2:40 pm" â€” a chase needs the time of day, unlike a class date:
 *  two calls on the same day are a different story from one. */
function whenChased(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${d
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()}`;
}

function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/** The chase trail under an outstanding item. */
function ChaseTrail({ chases }) {
  if (!chases || chases.length === 0) return null;
  const last = chases[chases.length - 1];
  const since = daysSince(last.chased_at);
  return (
    <div className="mt-1.5 border-l-2 border-navy-100 pl-2.5">
      <p className="text-xs font-medium text-navy-600">
        Chased {chases.length === 1 ? 'once' : `${chases.length} times`} Â· last{' '}
        {since === 0 ? 'today' : since === 1 ? 'yesterday' : `${since} days ago`} â€” still
        not uploaded
      </p>
      <ul className="mt-0.5 space-y-0.5">
        {chases.map((c) => (
          <li key={c.id} className="text-xs text-navy-400">
            {whenChased(c.chased_at)} Â· {c.chased_by_name || 'someone'}
            {c.note && <span className="text-navy-500"> â€” â€œ{c.note}â€</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** How to say "call this person" for however many teachers a batch has. */
function TeacherCall({ teachers }) {
  if (!teachers || teachers.length === 0) {
    return (
      <span className="text-xs font-medium text-orange-ink">
        No teacher assigned â€” tell an administrator
      </span>
    );
  }
  return (
    <span className="text-xs text-navy-500">
      {teachers.map((t, i) => (
        <span key={t.id}>
          {i > 0 && ', '}
          <span className="font-medium text-navy-700">{t.name}</span>
          {t.phone ? (
            <>
              {' '}
              <a className="text-teal-ink hover:underline" href={`tel:${t.phone.replace(/\s/g, '')}`}>
                {t.phone}
              </a>
            </>
          ) : (
            <span className="text-navy-400"> (no phone on file)</span>
          )}
        </span>
      ))}
    </span>
  );
}

/** A delivery date, or an honest admission that we do not have one.
 *  Everything uploaded before the timestamps existed reads "not recorded" â€”
 *  inventing a date from the row's creation would look like data and be
 *  fiction. */
function Delivered({ at, label }) {
  return (
    <li className="text-xs text-navy-500">
      <span className="font-medium text-navy-700">{label}</span>{' '}
      {at ? whenChased(at) : <span className="text-navy-300">date not recorded</span>}
    </li>
  );
}

/**
 * Closed â€” the point of the whole exercise: rang on these dates, arrived on
 * that one.
 *
 * Only classes somebody actually chased appear. A class that was uploaded on
 * time without anybody having to ring is not a follow-up story, and listing
 * every one of them would bury the handful that are.
 */
function ClosedTrail({ items }) {
  if (items.length === 0) {
    return (
      <div className="card">
        <EmptyState
          title="Nothing closed out yet"
          message="Once you log a call and the teacher uploads, the class moves here with both sets of dates."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div key={c.day_id} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-navy">
                Day {c.day_number} Â· {c.topic}
              </p>
              <p className="text-xs text-navy-400">
                <Link to={`/watch/batches/${c.batch_id}`} className="text-teal-ink hover:underline">
                  {c.batch_name}
                </Link>
                {c.scheduled_date && ` Â· scheduled ${formatDate(c.scheduled_date)}`}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-ink">
              Closed{c.closed_at ? ` ${whenChased(c.closed_at)}` : ''}
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                You followed up
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {c.chases.map((ch) => (
                  <li key={ch.id} className="text-xs text-navy-500">
                    <span className="font-medium text-navy-700">{whenChased(ch.chased_at)}</span>
                    {' Â· '}
                    {ch.chased_by_name || 'someone'}
                    {ch.note && <span> â€” â€œ{ch.note}â€</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                The teacher delivered
              </p>
              <ul className="mt-1.5 space-y-0.5">
                <Delivered at={c.taught_marked_at} label="Marked taught" />
                <Delivered at={c.recording_uploaded_at} label="Recording" />
                <Delivered at={c.notes_uploaded_at} label="Notes" />
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Logging a call. The note is optional â€” "no answer" and "says tonight" are
 *  worth keeping, but requiring one would just get it filled with a full
 *  stop. */
function ChaseModal({ item, onClose, onLogged }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/viewer/days/${item.day_id}/chase`, { note: note.trim() });
      toast.success(`Logged. Day ${item.day_number} stays on the list until it is uploaded.`);
      onLogged();
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
      title={`Log a call about day ${item.day_number}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-cta">
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Savingâ€¦' : 'Log the call'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-navy-50 p-3.5 text-xs text-navy-600">
          This records that you followed up â€” it does <strong>not</strong> tick the class off.
          Day {item.day_number} of {item.batch_name} stays on this list until{' '}
          {item.teachers[0]?.name || 'the teacher'} actually uploads, and then closes itself.
        </p>
        <div>
          <label className="label" htmlFor="chase-note">
            What did they say? <span className="font-normal text-navy-400">(optional)</span>
          </label>
          <input
            id="chase-note"
            className="input"
            maxLength={300}
            placeholder="No answer Â· Says he'll upload tonight"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

export default function ViewerFollowUps() {
  const [items, setItems] = useState([]);
  const [closedItems, setClosedItems] = useState([]);
  const [overview, setOverview] = useState(null);
  const [kind, setKind] = useState('');
  const [view, setView] = useState('open');
  const [chasing, setChasing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [f, o, c] = await Promise.all([
        api.get('/viewer/follow-ups'),
        api.get('/viewer/overview'),
        api.get('/viewer/closed'),
      ]);
      setItems(f.data);
      setOverview(o.data);
      setClosedItems(c.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* Filtering happens here rather than by re-fetching: the whole list is
     already loaded, and a viewer flicking between "no recording" and
     "everything" should not wait on a sleeping backend each time. */
  const shown = useMemo(
    () => (kind ? items.filter((i) => i.kind === kind) : items),
    [items, kind],
  );

  if (loading) return <Loading label="Checking every batchâ€¦" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        subtitle="Classes that need chasing, oldest first"
        action={
          <button type="button" onClick={load} className="btn-ghost btn-sm">
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Needs chasing" value={overview?.follow_ups ?? 0}
                  tone={(overview?.follow_ups ?? 0) > 0 ? 'orange' : 'teal'} />
        <StatCard label="Not marked taught" value={overview?.overdue_classes ?? 0} />
        <StatCard label="No recording" value={overview?.recordings_missing ?? 0} />
        <StatCard label="No notes" value={overview?.notes_missing ?? 0} />
      </div>

      <div className="mb-4 flex gap-2 border-b border-navy-100 pb-3">
        {[
          ['open', `Outstanding (${items.length})`],
          ['closed', `Closed (${closedItems.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={
              view === id
                ? 'rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white'
                : 'rounded-lg border border-navy-200 bg-white px-3.5 py-2 text-sm font-medium text-navy-600 transition hover:bg-navy-50'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'closed' ? (
        <ClosedTrail items={closedItems} />
      ) : (
      <>
      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id || 'all'}
            type="button"
            onClick={() => setKind(k.id)}
            aria-pressed={kind === k.id}
            className={
              kind === k.id
                ? 'rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white'
                : 'rounded-full bg-navy-50 px-4 py-1.5 text-sm font-medium text-navy-600 transition hover:bg-navy-100'
            }
          >
            {k.label}
            {k.id === '' ? ` (${items.length})` : ` (${items.filter((i) => i.kind === k.id).length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <EmptyState
            title={kind ? 'Nothing of that kind outstanding' : 'Everything is up to date'}
            message={
              kind
                ? 'Try another filter, or Everything to see the full list.'
                : 'Every class that has been taught has its recording and notes uploaded, and nothing is past its date unmarked.'
            }
          />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-navy-100">
              <thead className="bg-navy-50">
                <tr>
                  <th className="th">What is missing</th>
                  <th className="th">Class</th>
                  <th className="th">Batch</th>
                  <th className="th">Scheduled</th>
                  <th className="th">Who to call</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {shown.map((f) => (
                  <tr key={`${f.day_id}-${f.kind}`}>
                    <td className="td">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${KIND_BADGE[f.kind]}`}
                      >
                        {KIND_LABEL[f.kind]}
                      </span>
                    </td>
                    <td className="td">
                      <p className="font-semibold text-navy">Day {f.day_number}</p>
                      <p className="text-xs text-navy-400">{f.topic}</p>
                      <ChaseTrail chases={f.chases} />
                    </td>
                    <td className="td">
                      <Link
                        to={`/watch/batches/${f.batch_id}`}
                        className="font-medium text-teal-ink hover:underline"
                      >
                        {f.batch_name}
                      </Link>
                    </td>
                    <td className="td whitespace-nowrap">
                      {formatDate(f.scheduled_date) || <span className="text-navy-300">No date set</span>}
                      {f.days_overdue > 0 && (
                        <p className="text-xs font-medium text-orange-ink">
                          {f.days_overdue} day{f.days_overdue === 1 ? '' : 's'} ago
                        </p>
                      )}
                    </td>
                    <td className="td">
                      <TeacherCall teachers={f.teachers} />
                    </td>
                    <td className="td">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setChasing(f)}
                          className="btn-ghost btn-sm whitespace-nowrap"
                        >
                          {f.chases.length > 0 ? 'Chase again' : 'Log a call'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}

      {chasing && (
        <ChaseModal item={chasing} onClose={() => setChasing(null)} onLogged={load} />
      )}
    </div>
  );
}

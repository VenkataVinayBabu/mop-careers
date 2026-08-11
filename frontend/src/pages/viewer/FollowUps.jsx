import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { EmptyState, ErrorState, Loading, PageHeader, StatCard } from '../../components/ui';
import { formatDate } from '../../constants';

/*
 * The viewer's home screen, and the reason the role exists.
 *
 * A coordinator is not here to browse — they are here to find out who has not
 * uploaded a recording and ring them. So this is a worklist, not a dashboard:
 * every outstanding item, oldest first, each one already carrying the phone
 * number of the person to call.
 *
 * Nothing on this screen writes. There is no "mark as chased" — that would be
 * a new thing to keep in step with reality, and the item disappears on its own
 * the moment the teacher actually uploads.
 */

const KINDS = [
  { id: '', label: 'Everything' },
  { id: 'not_taught', label: 'Not marked taught' },
  { id: 'no_recording', label: 'No recording' },
  { id: 'no_notes', label: 'No notes' },
];

/* Written out rather than interpolated — Tailwind scans source text, so a
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

/** How to say "call this person" for however many teachers a batch has. */
function TeacherCall({ teachers }) {
  if (!teachers || teachers.length === 0) {
    return (
      <span className="text-xs font-medium text-orange-ink">
        No teacher assigned — tell an administrator
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

export default function ViewerFollowUps() {
  const [items, setItems] = useState([]);
  const [overview, setOverview] = useState(null);
  const [kind, setKind] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [f, o] = await Promise.all([
        api.get('/viewer/follow-ups'),
        api.get('/viewer/overview'),
      ]);
      setItems(f.data);
      setOverview(o.data);
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
     already loaded, and a coordinator flicking between "no recording" and
     "everything" should not wait on a sleeping backend each time. */
  const shown = useMemo(
    () => (kind ? items.filter((i) => i.kind === kind) : items),
    [items, kind],
  );

  if (loading) return <Loading label="Checking every batch…" />;
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

import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import Avatar from '../../components/Avatar';
import { useToast } from '../../components/Toast';
import { EmptyState, ErrorState, Loading, Modal, PageHeader } from '../../components/ui';
import { LIVE_PROGRAMS } from '../../data/programs';
import { applyMentors } from '../../data/siteSettings';
import WebsiteTabs from './WebsiteTabs';

/*
 * Admin > Website > Mentors.
 *
 * The point of this screen, in one sentence: deleting a mentor from the public
 * site should take a minute, not a developer and a git push. Nine of the
 * mentors currently live are fabricated stand-ins, and until now removing one
 * meant editing a data file and redeploying.
 *
 * The list is the database's, not the bundle's. The mentors table ships seeded
 * with the rows that used to be hardcoded, so an empty list here really does
 * mean an empty section on the site — see the mentors migration for why that
 * distinction matters.
 */

const BLANK = {
  name: '',
  former: '',
  focus: '',
  photo_url: '',
  programs: [],
  is_placeholder: false,
  published: true,
};

/* FastAPI validation errors arrive as [{loc: ['body','name'], msg}]. Worth
   unpacking so each message lands under the field that caused it. */
function fieldErrors(err) {
  const detail = err?.response?.data?.detail;
  if (!Array.isArray(detail)) return {};
  const out = {};
  detail.forEach((d) => {
    const key = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
    if (key) out[key] = String(d.msg).replace(/^Value error, /, '');
  });
  return out;
}

const programName = (slug) =>
  LIVE_PROGRAMS.find((p) => p.slug === slug)?.name || slug;

function MentorForm({ value, errors, onChange }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });

  const toggleProgram = (slug) => (e) => {
    const next = e.target.checked
      ? [...value.programs, slug]
      : value.programs.filter((s) => s !== slug);
    onChange({ ...value, programs: next });
  };

  const field = (key, label, hint, extra = {}) => (
    <div>
      <label className="label" htmlFor={`mentor-${key}`}>{label}</label>
      <input
        id={`mentor-${key}`}
        type="text"
        className={`input ${errors[key] ? 'border-orange focus:border-orange focus:ring-orange' : ''}`}
        value={value[key] ?? ''}
        onChange={set(key)}
        aria-invalid={Boolean(errors[key])}
        {...extra}
      />
      <p className={`mt-1.5 text-xs ${errors[key] ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
        {errors[key] || hint}
      </p>
    </div>
  );

  return (
    <div className="grid gap-4">
      {field('name', 'Name', 'As it should appear on the card.')}
      {field('former', 'Experience line', 'Shown above the name, e.g. “Ex-TCS · 8 yrs”.')}

      <div>
        <label className="label" htmlFor="mentor-focus">What they teach</label>
        <textarea
          id="mentor-focus"
          rows={3}
          maxLength={400}
          className={`input ${errors.focus ? 'border-orange focus:border-orange focus:ring-orange' : ''}`}
          value={value.focus}
          onChange={set('focus')}
          aria-invalid={Boolean(errors.focus)}
        />
        <div className="mt-1.5 flex justify-between gap-4">
          <p className={`text-xs ${errors.focus ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
            {errors.focus || 'One or two sentences. Long enough and the card grows taller than the others.'}
          </p>
          <span className="shrink-0 text-xs tabular-nums text-navy-400">{value.focus.length}/400</span>
        </div>
      </div>

      {field('photo_url', 'Photo link', 'Optional. A link to a hosted image — uploads need object storage, which is not set up yet. Leave blank for initials on a coloured tile.', { placeholder: 'https://…' })}

      <div>
        <span className="label">Programmes they teach</span>
        <p className="-mt-1 mb-2 text-xs text-navy-400">
          This is what puts them on a programme page. Tick none and they appear only on the home page.
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {LIVE_PROGRAMS.map((p) => (
            <label key={p.slug} className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-700">
              <input
                type="checkbox"
                checked={value.programs.includes(p.slug)}
                onChange={toggleProgram(p.slug)}
                className="h-4 w-4 rounded border-navy-300 text-teal focus:ring-teal"
              />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-2.5 rounded-lg bg-navy-50 p-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-navy-700">
          <input
            type="checkbox"
            checked={value.published}
            onChange={(e) => onChange({ ...value, published: e.target.checked })}
            className="h-4 w-4 rounded border-navy-300 text-teal focus:ring-teal"
          />
          Show on the public site
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-navy-700">
          <input
            type="checkbox"
            checked={value.is_placeholder}
            onChange={(e) => onChange({ ...value, is_placeholder: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-navy-300 text-orange focus:ring-orange"
          />
          <span>
            This is a stand-in, not a real person
            <span className="block text-xs text-navy-400">
              Marks the row here so it is obvious what still needs replacing. Untick it once a real mentor is in.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

export default function AdminWebsiteMentors() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [editing, setEditing] = useState(null); // the mentor being edited, or BLANK for a new one
  const [draft, setDraft] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  /* The admin list and the public store are different things: this one shows
     unpublished mentors too. `applyMentors` gets the published subset so the
     public site in another tab of this app is correct straight away. */
  const adopt = useCallback((all) => {
    setRows(all);
    applyMentors(all.filter((m) => m.published));
  }, []);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await api.get('/admin/website/mentors');
      adopt(data);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [adopt]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => ({
    total: rows.length,
    live: rows.filter((m) => m.published).length,
    placeholder: rows.filter((m) => m.is_placeholder).length,
  }), [rows]);

  const openNew = () => {
    setEditing(BLANK);
    setDraft(BLANK);
    setErrors({});
  };

  const openEdit = (mentor) => {
    setEditing(mentor);
    setDraft({ ...BLANK, ...mentor, programs: [...(mentor.programs || [])] });
    setErrors({});
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const body = {
        name: draft.name,
        former: draft.former,
        focus: draft.focus,
        photo_url: draft.photo_url,
        programs: draft.programs,
        is_placeholder: draft.is_placeholder,
        published: draft.published,
      };
      if (editing.id) {
        const { data } = await api.put(`/admin/website/mentors/${editing.id}`, body);
        adopt(rows.map((m) => (m.id === data.id ? data : m)));
        toast.success(`${data.name} updated.`);
      } else {
        const { data } = await api.post('/admin/website/mentors', body);
        adopt([...rows, data]);
        toast.success(`${data.name} added to the site.`);
      }
      setEditing(null);
    } catch (err) {
      const byField = fieldErrors(err);
      setErrors(byField);
      if (!Object.keys(byField).length) toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (mentor) => {
    setBusyId(mentor.id);
    try {
      const { data } = await api.put(`/admin/website/mentors/${mentor.id}`, {
        published: !mentor.published,
      });
      adopt(rows.map((m) => (m.id === data.id ? data : m)));
      toast.info(data.published ? `${data.name} is on the site.` : `${data.name} is hidden.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (mentor) => {
    /* A named person disappearing from a public page is worth one deliberate
       confirmation, and the name is in the prompt so it cannot be the wrong row. */
    if (!window.confirm(`Remove ${mentor.name} from the website? This cannot be undone.`)) return;
    setBusyId(mentor.id);
    try {
      await api.delete(`/admin/website/mentors/${mentor.id}`);
      adopt(rows.filter((m) => m.id !== mentor.id));
      toast.info(`${mentor.name} removed.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  /* Reorder sends the whole list rather than "move this one up", so a request
     cannot leave the table half-sorted. The move is applied locally first so
     the row does not visibly lag the click. */
  const move = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    setBusyId(rows[index].id);
    try {
      const { data } = await api.post('/admin/website/mentors/reorder', {
        ids: next.map((m) => m.id),
      });
      adopt(data);
    } catch (err) {
      toast.error(errorMessage(err));
      load(); // put the real order back
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading label="Loading mentors…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  return (
    <div>
      <WebsiteTabs />
      <PageHeader
        title="Mentors"
        subtitle={`${counts.live} on the site${counts.total !== counts.live ? ` · ${counts.total - counts.live} hidden` : ''}`}
        action={
          <button type="button" className="btn-cta" onClick={openNew}>
            Add a mentor
          </button>
        }
      />

      {counts.placeholder > 0 && (
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-ink">
          <strong className="font-semibold">
            {counts.placeholder} {counts.placeholder === 1 ? 'mentor is' : 'mentors are'} marked as a stand-in.
          </strong>{' '}
          These are not real people and they are live on the public site. Replace them with real
          mentors, or delete them.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No mentors"
            message="The mentors section is hidden on the public site until you add someone."
            action={
              <button type="button" className="btn-cta" onClick={openNew}>
                Add a mentor
              </button>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((m, i) => (
            <li key={m.id} className={`card p-4 ${m.published ? '' : 'opacity-70'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar
                  name={m.name}
                  photo={m.photo_url || null}
                  index={i}
                  className="h-14 w-14 shrink-0 rounded-xl"
                  textClassName="text-base"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy">{m.name}</h3>
                    {m.is_placeholder && (
                      <span className="badge bg-orange-100 text-orange-ink">Stand-in</span>
                    )}
                    {!m.published && <span className="badge bg-navy-100 text-navy-600">Hidden</span>}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-ink">{m.former}</p>
                  <p className="mt-1.5 text-sm text-navy-600">{m.focus}</p>
                  <p className="mt-2 text-xs text-navy-400">
                    {m.programs.length
                      ? m.programs.map(programName).join(' · ')
                      : 'Not on any programme page'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || busyId !== null}
                      aria-label={`Move ${m.name} up`}
                      className="rounded p-1 text-navy-400 hover:bg-navy-50 hover:text-navy disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m18 15-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1 || busyId !== null}
                      aria-label={`Move ${m.name} down`}
                      className="rounded p-1 text-navy-400 hover:bg-navy-50 hover:text-navy disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={busyId === m.id}
                    onClick={() => togglePublished(m)}
                  >
                    {m.published ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={busyId === m.id}
                    onClick={() => openEdit(m)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm text-orange"
                    disabled={busyId === m.id}
                    onClick={() => remove(m)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        title={editing?.id ? `Edit ${editing.name}` : 'Add a mentor'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="mentor-form" className="btn-cta" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {/* The submit button lives in the modal footer, outside this form, so
            it is wired back with form="mentor-form" rather than duplicating a
            second submit inside. */}
        <form id="mentor-form" onSubmit={save}>
          <MentorForm value={draft} errors={errors} onChange={setDraft} />
        </form>
      </Modal>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';

import Avatar from '../../components/Avatar';
import { EmptyState, ErrorState, Loading, Modal, PageHeader } from '../../components/ui';
import { applyMentors, refreshPublicContent, usePrograms } from '../../data/siteSettings';
import ReorderButtons from './ReorderButtons';
import WebsiteTabs from './WebsiteTabs';
import { useContentList } from './websiteContent';

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
 * mean an empty section on the site â€” see the mentors migration for why that
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

function MentorForm({ value, errors, onChange, programs }) {
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
      {field('former', 'Experience line', 'Shown above the name, e.g. â€œEx-TCS Â· 8 yrsâ€.')}

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

      {field('photo_url', 'Photo link', 'Optional. A link to a hosted image â€” uploads need object storage, which is not set up yet. Leave blank for initials on a coloured tile.', { placeholder: 'https://â€¦' })}

      <div>
        <span className="label">Programmes they teach</span>
        <p className="-mt-1 mb-2 text-xs text-navy-400">
          This is what puts them on a programme page. Tick none and they appear only on the home page.
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {programs.map((p) => (
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
  const [editing, setEditing] = useState(null); // the mentor being edited, or BLANK for a new one
  const [draft, setDraft] = useState(BLANK);

  /* The admin list carries unpublished rows too; the public store only wants
     what is live, so another tab of this app is correct straight away.
     Memoised so the list hook's load effect does not re-run every render. */
  const adopt = useCallback((all) => applyMentors(all.filter((m) => m.published)), []);
  const list = useContentList('/admin/website/mentors', adopt, 'mentor', 'mentor');
  /* The programme tick-boxes come from the live catalogue, so a programme an
     admin has just added is assignable straight away. */
  const programs = usePrograms();
  const programName = (slug) => programs.find((p) => p.slug === slug)?.name || slug;

  /* The admin app never renders the public header, so nothing has asked for
     the catalogue yet. Deduplicated, so this costs one request per session. */
  useEffect(() => {
    refreshPublicContent();
  }, []);

  const counts = useMemo(() => ({
    total: list.rows.length,
    live: list.rows.filter((m) => m.published).length,
    placeholder: list.rows.filter((m) => m.is_placeholder).length,
  }), [list.rows]);

  const openNew = () => { setEditing(BLANK); setDraft(BLANK); list.setErrors({}); };
  const openEdit = (mentor) => {
    setEditing(mentor);
    setDraft({ ...BLANK, ...mentor, programs: [...(mentor.programs || [])] });
    list.setErrors({});
  };

  const submit = async (e) => {
    e.preventDefault();
    const ok = await list.save(editing, {
      name: draft.name,
      former: draft.former,
      focus: draft.focus,
      photo_url: draft.photo_url,
      programs: draft.programs,
      is_placeholder: draft.is_placeholder,
      published: draft.published,
    });
    if (ok) setEditing(null);
  };

  if (list.loading) return <Loading label="Loading mentorsâ€¦" />;
  if (list.loadError) return <ErrorState message={list.loadError} onRetry={list.load} />;

  return (
    <div>
      <WebsiteTabs />
      <PageHeader
        title="Mentors"
        subtitle={`${counts.live} on the site${counts.total !== counts.live ? ` Â· ${counts.total - counts.live} hidden` : ''}`}
        action={<button type="button" className="btn-cta" onClick={openNew}>Add a mentor</button>}
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

      {list.rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No mentors"
            message="The mentors section is hidden on the public site until you add someone."
            action={<button type="button" className="btn-cta" onClick={openNew}>Add a mentor</button>}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.rows.map((m, i) => (
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
                      ? m.programs.map(programName).join(' Â· ')
                      : 'Not on any programme page'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <ReorderButtons
                    index={i}
                    total={list.rows.length}
                    label={m.name}
                    disabled={list.busyId !== null}
                    onMove={list.move}
                  />
                  <button type="button" className="btn-ghost btn-sm" disabled={list.busyId === m.id}
                          onClick={() => list.togglePublished(m)}>
                    {m.published ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" className="btn-ghost btn-sm" disabled={list.busyId === m.id}
                          onClick={() => openEdit(m)}>
                    Edit
                  </button>
                  <button type="button" className="btn-ghost btn-sm text-orange" disabled={list.busyId === m.id}
                          onClick={() => list.remove(m)}>
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
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" form="mentor-form" className="btn-cta" disabled={list.saving}>
              {list.saving ? 'Savingâ€¦' : 'Save'}
            </button>
          </>
        }
      >
        {/* The submit button lives in the modal footer, outside this form, so
            it is wired back with form="mentor-form" rather than duplicating a
            second submit inside. */}
        <form id="mentor-form" onSubmit={submit}>
          <MentorForm value={draft} errors={list.errors} onChange={setDraft} programs={programs} />
        </form>
      </Modal>
    </div>
  );
}

import { useCallback, useMemo, useState } from 'react';

import Avatar from '../../components/Avatar';
import { EmptyState, ErrorState, Loading, Modal, PageHeader } from '../../components/ui';
import ReorderButtons from './ReorderButtons';
import WebsiteTabs from './WebsiteTabs';
import { useContentList } from './websiteContent';

/*
 * Admin > Website > Leadership — the people on the About page.
 *
 * Deliberately not the mentors screen: a mentor teaches a programme and gets
 * programme tick-boxes and a place on the programme pages. A COO or a lead
 * developer belongs to neither, and putting them in the same list would have
 * them turning up on the mentors carousel as somebody who teaches Python.
 *
 * Order here is the order on the page, so the CEO stays first however many
 * people get added below.
 */

const SECTIONS = {
  leadership: 'Our Leadership',
  team: 'Our Team',
};

const BLANK = {
  section: 'leadership',
  name: '',
  role: '',
  tags: [],
  meta: '',
  bio: '',
  photo_url: '',
  published: true,
};

function LeaderForm({ value, errors, onChange }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });

  const field = (key, label, hint, extra = {}) => (
    <div>
      <label className="label" htmlFor={`leader-${key}`}>{label}</label>
      <input
        id={`leader-${key}`}
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
      <div>
        <label className="label" htmlFor="leader-section">Section</label>
        <select
          id="leader-section"
          className="input"
          value={value.section}
          onChange={set('section')}
        >
          {Object.entries(SECTIONS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-navy-400">
          Which block on the About page. Leadership is who runs MOP; Team is everyone else who
          builds and delivers it.
        </p>
      </div>

      {field('name', 'Name', 'As it should appear on the About page.')}
      {field('role', 'Title', 'e.g. CEO — MOP Careers, COO, Full Stack Developer.')}

      <div>
        <label className="label" htmlFor="leader-tags">Previous companies</label>
        <input
          id="leader-tags"
          type="text"
          className="input"
          value={value.tags.join(', ')}
          onChange={(e) => onChange({ ...value, tags: e.target.value.split(',').map((s) => s.trim()) })}
          placeholder="Ex-Capgemini, Ex-Wipro"
        />
        <p className="mt-1.5 text-xs text-navy-400">
          Separated by commas. Shown as small pills beside the name. Leave blank for none.
        </p>
      </div>

      {field('meta', 'Experience line', 'The highlighted pill, e.g. “15+ Years · Data Science”.')}

      <div>
        <label className="label" htmlFor="leader-bio">Biography</label>
        <textarea
          id="leader-bio"
          rows={7}
          maxLength={4000}
          className={`input ${errors.bio ? 'border-orange focus:border-orange focus:ring-orange' : ''}`}
          value={value.bio}
          onChange={set('bio')}
          aria-invalid={Boolean(errors.bio)}
        />
        <p className={`mt-1.5 text-xs ${errors.bio ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
          {errors.bio || 'Leave a blank line between paragraphs — each becomes its own paragraph on the page.'}
        </p>
      </div>

      {field('photo_url', 'Photo link', 'Optional. Either a full https:// link to a hosted image, or a file committed to frontend/public — e.g. /team/vinay.jpg. Leave blank for initials on a coloured tile.', { placeholder: 'https://… or /team/name.jpg' })}

      <div className="rounded-lg bg-navy-50 p-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-navy-700">
          <input
            type="checkbox"
            checked={value.published}
            onChange={(e) => onChange({ ...value, published: e.target.checked })}
            className="h-4 w-4 rounded border-navy-300 text-teal focus:ring-teal"
          />
          Show on the About page
        </label>
      </div>
    </div>
  );
}

export default function AdminWebsiteLeaders() {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(BLANK);

  /* The About page fetches its own leaders on load rather than reading the
     shared public settings cache, so there is nothing to push here. */
  const adopt = useCallback(() => {}, []);
  const list = useContentList('/admin/website/leaders', adopt, 'leader', 'leader');

  const counts = useMemo(() => ({
    total: list.rows.length,
    live: list.rows.filter((l) => l.published).length,
    leadership: list.rows.filter((l) => l.section === 'leadership' && l.published).length,
    team: list.rows.filter((l) => l.section === 'team' && l.published).length,
  }), [list.rows]);

  const openNew = () => { setEditing(BLANK); setDraft(BLANK); list.setErrors({}); };
  const openEdit = (row) => {
    setEditing(row);
    setDraft({ ...BLANK, ...row, tags: [...(row.tags || [])] });
    list.setErrors({});
  };

  const submit = async (e) => {
    e.preventDefault();
    const ok = await list.save(editing, {
      section: draft.section,
      name: draft.name,
      role: draft.role,
      tags: draft.tags.filter(Boolean),
      meta: draft.meta,
      bio: draft.bio,
      photo_url: draft.photo_url,
      published: draft.published,
    });
    if (ok) setEditing(null);
  };

  if (list.loading) return <Loading label="Loading leadership…" />;
  if (list.loadError) return <ErrorState message={list.loadError} onRetry={list.load} />;

  return (
    <div>
      <WebsiteTabs />
      <PageHeader
        title="Leadership & team"
        subtitle={`${counts.leadership} in Leadership · ${counts.team} in Team${
          counts.total !== counts.live ? ` · ${counts.total - counts.live} hidden` : ''
        }`}
        action={<button type="button" className="btn-cta" onClick={openNew}>Add a person</button>}
      />

      {list.rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Nobody listed"
            message="The leadership section is hidden on the About page until you add someone."
            action={<button type="button" className="btn-cta" onClick={openNew}>Add a person</button>}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.rows.map((l, i) => (
            <li key={l.id} className={`card p-4 ${l.published ? '' : 'opacity-70'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar
                  name={l.name}
                  photo={l.photo_url || null}
                  index={i}
                  className="h-14 w-14 shrink-0 rounded-xl"
                  textClassName="text-base"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy">{l.name}</h3>
                    <span className="badge bg-teal-50 text-teal-ink">{SECTIONS[l.section]}</span>
                    {!l.published && <span className="badge bg-navy-100 text-navy-600">Hidden</span>}
                    {list.pendingByRow[l.id] && (
                      <span className="badge bg-orange-100 text-orange-ink">Change waiting</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-ink">{l.role}</p>
                  <p className="mt-1 text-xs text-navy-400">
                    {[...(l.tags || []), l.meta].filter(Boolean).join(' · ') || 'No companies or experience line'}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-navy-600">{l.bio}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <ReorderButtons
                    index={i}
                    total={list.rows.length}
                    label={l.name}
                    disabled={list.busyId !== null}
                    onMove={list.move}
                  />
                  <button type="button" className="btn-ghost btn-sm" disabled={list.busyId === l.id}
                          onClick={() => list.togglePublished(l)}>
                    {l.published ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" className="btn-ghost btn-sm" disabled={list.busyId === l.id}
                          onClick={() => openEdit(l)}>
                    Edit
                  </button>
                  <button type="button" className="btn-ghost btn-sm text-orange" disabled={list.busyId === l.id}
                          onClick={() => list.remove(l)}>
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
        title={editing?.id ? `Edit ${editing.name}` : 'Add a person'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" form="leader-form" className="btn-cta" disabled={list.saving}>
              {list.saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <form id="leader-form" onSubmit={submit}>
          <LeaderForm value={draft} errors={list.errors} onChange={setDraft} />
        </form>
      </Modal>
    </div>
  );
}

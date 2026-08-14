import { useCallback, useMemo, useState } from 'react';

import { EmptyState, ErrorState, Loading, Modal, PageHeader } from '../../components/ui';
import ReorderButtons from './ReorderButtons';
import WebsiteTabs from './WebsiteTabs';
import { useContentList } from './websiteContent';

/*
 * Admin > Website > Openings — the roles on /careers.
 *
 * The point of this screen: posting or closing a job should take a minute, not
 * a developer and a deploy. The four roles that used to be hardcoded in
 * Careers.jsx ship seeded into this table, so an empty list here really does
 * mean "nothing is open" rather than "not set up yet" — the careers page says
 * exactly that when it happens.
 *
 * Closing a role is Hide, not Delete. A filled position tends to reopen next
 * quarter, and retyping it is how the salary band and the requirements quietly
 * drift from what was agreed.
 */

const BLANK = {
  name: '',
  department: '',
  location: '',
  description: '',
  experience: '',
  salary: '',
  skills: [],
  published: true,
};

function OpeningForm({ value, errors, onChange }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });

  const field = (key, label, hint, extra = {}) => (
    <div>
      <label className="label" htmlFor={`opening-${key}`}>{label}</label>
      <input
        id={`opening-${key}`}
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
      {field('name', 'Job title', 'As it should appear on the careers page.')}

      <div className="grid gap-4 sm:grid-cols-2">
        {field('department', 'Team', 'e.g. Engineering, Placement Team, Marketing.')}
        {field('location', 'Location', 'A city or an arrangement — Bangalore, Remote, Hybrid.')}
      </div>

      <div>
        <label className="label" htmlFor="opening-description">Description</label>
        <textarea
          id="opening-description"
          rows={4}
          maxLength={2000}
          className={`input ${errors.description ? 'border-orange focus:border-orange focus:ring-orange' : ''}`}
          value={value.description}
          onChange={set('description')}
          aria-invalid={Boolean(errors.description)}
        />
        <p className={`mt-1.5 text-xs ${errors.description ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
          {errors.description || 'A short paragraph on what the person will actually do.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field('experience', 'Experience required', 'e.g. 3-5 years in HR/Placement.')}
        {/* Free text on purpose: "Competitive" and blank are both real answers,
            and a number would force a decision the business may not have made. */}
        {field('salary', 'Salary', 'e.g. ₹12-18 LPA. Leave blank to publish no figure.')}
      </div>

      <div>
        <label className="label" htmlFor="opening-skills">Skills</label>
        <input
          id="opening-skills"
          type="text"
          className="input"
          value={value.skills.join(', ')}
          /* Split on save rather than per keystroke, or typing a comma would
             fight the cursor. */
          onChange={(e) => onChange({ ...value, skills: e.target.value.split(',').map((s) => s.trim()) })}
          placeholder="React, Node.js, PostgreSQL"
        />
        <p className="mt-1.5 text-xs text-navy-400">
          Separated by commas. Shown as tags under the description. Capitals are kept as typed.
        </p>
      </div>

      <div className="rounded-lg bg-navy-50 p-4">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium text-navy-700">
          <input
            type="checkbox"
            checked={value.published}
            onChange={(e) => onChange({ ...value, published: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-navy-300 text-teal focus:ring-teal"
          />
          <span>
            Show on the careers page
            <span className="block text-xs text-navy-400">
              Untick to close the role without deleting it — it keeps its details and can be put
              back up later.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

export default function AdminWebsiteOpenings() {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(BLANK);

  /* Nothing to push into the public store: the careers page fetches its own
     openings when it loads, rather than reading the shared settings cache. */
  const adopt = useCallback(() => {}, []);
  const list = useContentList('/admin/website/openings', adopt, 'opening', 'opening');

  const counts = useMemo(() => ({
    total: list.rows.length,
    live: list.rows.filter((o) => o.published).length,
  }), [list.rows]);

  const openNew = () => { setEditing(BLANK); setDraft(BLANK); list.setErrors({}); };
  const openEdit = (row) => {
    setEditing(row);
    setDraft({ ...BLANK, ...row, skills: [...(row.skills || [])] });
    list.setErrors({});
  };

  const submit = async (e) => {
    e.preventDefault();
    const ok = await list.save(editing, {
      name: draft.name,
      department: draft.department,
      location: draft.location,
      description: draft.description,
      experience: draft.experience,
      salary: draft.salary,
      skills: draft.skills.filter(Boolean),
      published: draft.published,
    });
    if (ok) setEditing(null);
  };

  if (list.loading) return <Loading label="Loading openings…" />;
  if (list.loadError) return <ErrorState message={list.loadError} onRetry={list.load} />;

  return (
    <div>
      <WebsiteTabs />
      <PageHeader
        title="Job openings"
        subtitle={`${counts.live} on the careers page${
          counts.total !== counts.live ? ` · ${counts.total - counts.live} closed` : ''
        }`}
        action={<button type="button" className="btn-cta" onClick={openNew}>Post a job</button>}
      />

      {/* No "your changes need approval" notice here — WebsiteTabs carries it
          for every screen in this section, so it cannot go missing from one. */}
      {list.rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No openings"
            message="The careers page tells visitors nothing is open and invites them to send a resume anyway."
            action={<button type="button" className="btn-cta" onClick={openNew}>Post a job</button>}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.rows.map((o, i) => (
            <li key={o.id} className={`card p-4 ${o.published ? '' : 'opacity-70'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy">{o.name}</h3>
                    {!o.published && <span className="badge bg-navy-100 text-navy-600">Closed</span>}
                    {list.pendingByRow[o.id] && (
                      <span className="badge bg-orange-100 text-orange-ink">Change waiting</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-ink">
                    {[o.department, o.location].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-navy-600">{o.description}</p>
                  <p className="mt-2 text-xs text-navy-400">
                    {[o.experience, o.salary].filter(Boolean).join(' · ') || 'No experience or salary given'}
                    {o.skills.length > 0 && ` · ${o.skills.join(', ')}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <ReorderButtons
                    index={i}
                    total={list.rows.length}
                    label={o.name}
                    disabled={list.busyId !== null}
                    onMove={list.move}
                  />
                  <button type="button" className="btn-ghost btn-sm" disabled={list.busyId === o.id}
                          onClick={() => list.togglePublished(o)}>
                    {o.published ? 'Close' : 'Reopen'}
                  </button>
                  <button type="button" className="btn-ghost btn-sm" disabled={list.busyId === o.id}
                          onClick={() => openEdit(o)}>
                    Edit
                  </button>
                  <button type="button" className="btn-ghost btn-sm text-orange" disabled={list.busyId === o.id}
                          onClick={() => list.remove(o)}>
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
        title={editing?.id ? `Edit ${editing.name}` : 'Post a job'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" form="opening-form" className="btn-cta" disabled={list.saving}>
              {list.saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <form id="opening-form" onSubmit={submit}>
          <OpeningForm value={draft} errors={list.errors} onChange={setDraft} />
        </form>
      </Modal>
    </div>
  );
}

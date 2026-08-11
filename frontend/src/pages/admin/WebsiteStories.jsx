import { useCallback, useState } from 'react';

import Avatar from '../../components/Avatar';
import { EmptyState, ErrorState, Loading, Modal, PageHeader } from '../../components/ui';
import { applyStories } from '../../data/siteSettings';
import ReorderButtons from './ReorderButtons';
import WebsiteTabs from './WebsiteTabs';
import { useContentList } from './websiteContent';

/*
 * Admin > Website > Stories â€” the learner testimonials on the home page.
 *
 * These are words attributed to named people, which shapes two things here:
 * the quote is capped at 200 characters at the INPUT rather than truncated at
 * render, and the screen says plainly that consent is needed. A testimonial
 * silently clipped mid-sentence looks like a broken site to whoever wrote it,
 * and an over-long one drags the whole card row taller and hollows out the
 * cards beside it.
 */

const QUOTE_MAX = 200;

const BLANK = { name: '', role: '', quote: '', photo_url: '', published: true };

export default function AdminWebsiteStories() {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(BLANK);

  /* The admin list carries unpublished rows too; the public store only wants
     what is live. Memoised so the list hook's effect does not re-run. */
  const adopt = useCallback((all) => applyStories(all.filter((s) => s.published)), []);
  const list = useContentList('/admin/website/stories', adopt, 'story', 'story');

  const openNew = () => { setEditing(BLANK); setDraft(BLANK); list.setErrors({}); };
  const openEdit = (story) => { setEditing(story); setDraft({ ...BLANK, ...story }); list.setErrors({}); };

  const submit = async (e) => {
    e.preventDefault();
    const ok = await list.save(editing, {
      name: draft.name,
      role: draft.role,
      quote: draft.quote,
      photo_url: draft.photo_url,
      published: draft.published,
    });
    if (ok) setEditing(null);
  };

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const err = list.errors;

  if (list.loading) return <Loading label="Loading storiesâ€¦" />;
  if (list.loadError) return <ErrorState message={list.loadError} onRetry={list.load} />;

  const live = list.rows.filter((s) => s.published).length;

  return (
    <div>
      <WebsiteTabs />
      <PageHeader
        title="Learner stories"
        subtitle={`${live} on the site${list.rows.length !== live ? ` Â· ${list.rows.length - live} hidden` : ''}`}
        action={<button type="button" className="btn-cta" onClick={openNew}>Add a story</button>}
      />

      <div className="mb-5 rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm text-navy-600">
        These are quotes attributed to real learners. Get their written consent before publishing
        one, and never edit a quote to fit the layout â€” shorten the wording with them, or leave it.
      </div>

      {list.rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No stories"
            message="The learner stories section is hidden on the public site until you add one."
            action={<button type="button" className="btn-cta" onClick={openNew}>Add a story</button>}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.rows.map((s, i) => (
            <li key={s.id} className={`card p-4 ${s.published ? '' : 'opacity-70'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar
                  name={s.name}
                  photo={s.photo_url || null}
                  index={i}
                  className="h-12 w-12 shrink-0 rounded-full"
                  textClassName="text-sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy">{s.name}</h3>
                    {s.role && <span className="text-xs text-navy-400">{s.role}</span>}
                    {!s.published && <span className="badge bg-navy-100 text-navy-600">Hidden</span>}
                  </div>
                  <blockquote className="mt-1.5 text-sm text-navy-600">&ldquo;{s.quote}&rdquo;</blockquote>
                  <p className="mt-2 text-xs text-navy-400">{s.quote.length}/{QUOTE_MAX} characters</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <ReorderButtons
                    index={i}
                    total={list.rows.length}
                    label={s.name}
                    disabled={list.busyId !== null}
                    onMove={list.move}
                  />
                  <button type="button" className="btn-ghost btn-sm" disabled={list.busyId === s.id}
                          onClick={() => list.togglePublished(s)}>
                    {s.published ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" className="btn-ghost btn-sm" disabled={list.busyId === s.id}
                          onClick={() => openEdit(s)}>
                    Edit
                  </button>
                  <button type="button" className="btn-ghost btn-sm text-orange" disabled={list.busyId === s.id}
                          onClick={() => list.remove(s)}>
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
        title={editing?.id ? `Edit ${editing.name}` : 'Add a story'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" form="story-form" className="btn-cta" disabled={list.saving}>
              {list.saving ? 'Savingâ€¦' : 'Save'}
            </button>
          </>
        }
      >
        <form id="story-form" onSubmit={submit} className="grid gap-4">
          <div>
            <label className="label" htmlFor="story-name">Name</label>
            <input id="story-name" type="text" value={draft.name} onChange={set('name')}
                   aria-invalid={Boolean(err.name)}
                   className={`input ${err.name ? 'border-orange focus:border-orange focus:ring-orange' : ''}`} />
            {err.name && <p className="mt-1.5 text-xs font-medium text-orange-ink">{err.name}</p>}
          </div>

          <div>
            <label className="label" htmlFor="story-role">Where they work now</label>
            <input id="story-role" type="text" value={draft.role} onChange={set('role')}
                   placeholder="Data Analyst"
                   aria-invalid={Boolean(err.role)}
                   className={`input ${err.role ? 'border-orange focus:border-orange focus:ring-orange' : ''}`} />
            <p className={`mt-1.5 text-xs ${err.role ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
              {err.role || 'Shown under their name on the card.'}
            </p>
          </div>

          <div>
            <label className="label" htmlFor="story-quote">Their words</label>
            <textarea id="story-quote" rows={4} maxLength={QUOTE_MAX} value={draft.quote}
                      onChange={set('quote')} aria-invalid={Boolean(err.quote)}
                      className={`input ${err.quote ? 'border-orange focus:border-orange focus:ring-orange' : ''}`} />
            <div className="mt-1.5 flex justify-between gap-4">
              <p className={`text-xs ${err.quote ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
                {err.quote || 'Quote them exactly. The cards sit in a row, so a much longer quote leaves the others looking empty.'}
              </p>
              <span className={`shrink-0 text-xs tabular-nums ${draft.quote.length > QUOTE_MAX - 20 ? 'font-semibold text-orange-ink' : 'text-navy-400'}`}>
                {draft.quote.length}/{QUOTE_MAX}
              </span>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="story-photo_url">Photo link</label>
            <input id="story-photo_url" type="text" value={draft.photo_url} onChange={set('photo_url')}
                   placeholder="https://â€¦" aria-invalid={Boolean(err.photo_url)}
                   className={`input ${err.photo_url ? 'border-orange focus:border-orange focus:ring-orange' : ''}`} />
            <p className={`mt-1.5 text-xs ${err.photo_url ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
              {err.photo_url || 'Optional, and only with their consent. Blank shows their initials instead.'}
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-navy-50 p-4 text-sm font-medium text-navy-700">
            <input type="checkbox" checked={draft.published}
                   onChange={(e) => setDraft((d) => ({ ...d, published: e.target.checked }))}
                   className="h-4 w-4 rounded border-navy-300 text-teal focus:ring-teal" />
            Show on the public site
          </label>
        </form>
      </Modal>
    </div>
  );
}

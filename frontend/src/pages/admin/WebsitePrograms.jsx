import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { applyPrograms } from '../../data/siteSettings';
import ReorderButtons from './ReorderButtons';
import WebsiteTabs from './WebsiteTabs';
import { useContentList } from './websiteContent';

/*
 * Admin > Website > Programs — the list.
 *
 * Editing one is a whole page of its own (WebsiteProgramEditor), not a modal:
 * a programme carries a syllabus, roles, projects and an FAQ, which is far
 * more than fits in a dialog. This screen does the things that make sense
 * across the catalogue — order, publish, delete — and hands off for the rest.
 */

const CATEGORY_LABEL = {
  ai: 'Data & AI',
  dev: 'Development',
  infra: 'Cloud & Security',
  mkt: 'Marketing',
};

/** How much of a programme's own page is actually written. Worth showing:
 *  seven of the eight detail blocks were drafted in-session, and an empty one
 *  is the honest signal that a page still needs MOP's words. */
function detailSummary(detail = {}) {
  const parts = [
    ['phase', (detail.syllabus || []).length],
    ['role', (detail.roles || []).length],
    ['project', (detail.projects || []).length],
    ['question', (detail.faq || []).length],
  ].filter(([, n]) => n > 0);
  if (!parts.length) return 'No page content yet';
  return parts.map(([word, n]) => `${n} ${word}${n === 1 ? '' : 's'}`).join(' · ');
}

export default function AdminWebsitePrograms() {
  const adopt = useCallback((all) => applyPrograms(all.filter((p) => p.published)), []);
  const list = useContentList('/admin/website/programs', adopt, 'program');

  if (list.loading) return <Loading label="Loading programmes…" />;
  if (list.loadError) return <ErrorState message={list.loadError} onRetry={list.load} />;

  const live = list.rows.filter((p) => p.published).length;
  const unconfirmed = list.rows.filter((p) => !p.confirmed).length;

  return (
    <div>
      <WebsiteTabs />
      <PageHeader
        title="Programs"
        subtitle={`${live} on the site${list.rows.length !== live ? ` · ${list.rows.length - live} hidden` : ''}`}
        action={<Link to="/admin/website/programs/new" className="btn-cta">Add a program</Link>}
      />

      {unconfirmed > 0 && (
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-ink">
          <strong className="font-semibold">
            {unconfirmed} {unconfirmed === 1 ? 'programme is' : 'programmes are'} marked unconfirmed.
          </strong>{' '}
          Nobody has confirmed MOP actually runs {unconfirmed === 1 ? 'it' : 'them'}. Hide
          {unconfirmed === 1 ? ' it' : ' them'} until someone has, or tick “MOP confirms it runs this”
          on the programme.
        </div>
      )}

      {list.rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No programmes"
            message="The programmes section is hidden on the public site until you add one."
            action={<Link to="/admin/website/programs/new" className="btn-cta">Add a program</Link>}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.rows.map((p, i) => (
            <li key={p.id} className={`card p-4 ${p.published ? '' : 'opacity-70'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy">{p.name}</h3>
                    {p.badge && <span className="badge bg-teal-100 text-teal-700">{p.badge}</span>}
                    {p.featured && <span className="badge bg-navy-100 text-navy-600">Featured</span>}
                    {!p.confirmed && <span className="badge bg-orange-100 text-orange-ink">Unconfirmed</span>}
                    {!p.published && <span className="badge bg-navy-100 text-navy-600">Hidden</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-navy-400">
                    /programs/{p.slug}
                    {p.category && ` · ${CATEGORY_LABEL[p.category] || p.category}`}
                    {p.duration && ` · ${p.duration}`}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-navy-600">{p.summary}</p>
                  <p className="mt-2 text-xs text-navy-400">
                    {detailSummary(p.detail)}
                    {' · '}
                    {/* The training side, which is what a new batch is built
                        from — invisible on the public site but the thing a
                        wrongly-set day count would quietly break. */}
                    {p.total_days} class days
                    {(p.curriculum || []).length > 0
                      ? `, ${p.curriculum.length} planned`
                      : ', none planned'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <ReorderButtons
                    index={i}
                    total={list.rows.length}
                    label={p.name}
                    disabled={list.busyId !== null}
                    onMove={list.move}
                  />
                  <button type="button" className="btn-ghost btn-sm" disabled={list.busyId === p.id}
                          onClick={() => list.togglePublished(p)}>
                    {p.published ? 'Hide' : 'Show'}
                  </button>
                  <Link to={`/admin/website/programs/${p.id}`} className="btn-ghost btn-sm">
                    Edit
                  </Link>
                  <button type="button" className="btn-ghost btn-sm text-orange" disabled={list.busyId === p.id}
                          onClick={() => list.remove(p)}>
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

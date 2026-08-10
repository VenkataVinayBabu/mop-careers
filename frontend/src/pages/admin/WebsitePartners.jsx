import { useCallback, useState } from 'react';

import { EmptyState, ErrorState, Loading, Modal, PageHeader } from '../../components/ui';
import { applyPartners } from '../../data/siteSettings';
import ReorderButtons from './ReorderButtons';
import WebsiteTabs from './WebsiteTabs';
import { useContentList } from './websiteContent';

/*
 * Admin > Website > Hiring partners.
 *
 * One list feeds two places on the public site: every published company sits
 * in the hiring-network grid, and the ones carrying a package also scroll past
 * in the placements ticker under the hero. They used to be two hardcoded lists
 * that overlapped in ten of twelve entries — two lists to keep in agreement
 * for no gain.
 *
 * The package figure is the strongest claim anywhere on the site: "Cred ·
 * ₹28 LPA" says a named company paid a MOP learner that. The screen says so.
 */

const BLANK = { name: '', logo_url: '', package_lpa: '', published: true };

export default function AdminWebsitePartners() {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(BLANK);

  const adopt = useCallback((all) => applyPartners(all.filter((p) => p.published)), []);
  const list = useContentList('/admin/website/partners', adopt, 'company');

  const openNew = () => { setEditing(BLANK); setDraft(BLANK); list.setErrors({}); };
  const openEdit = (row) => { setEditing(row); setDraft({ ...BLANK, ...row }); list.setErrors({}); };

  const submit = async (e) => {
    e.preventDefault();
    const ok = await list.save(editing, {
      name: draft.name,
      logo_url: draft.logo_url,
      package_lpa: draft.package_lpa,
      published: draft.published,
    });
    if (ok) setEditing(null);
  };

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const err = list.errors;

  if (list.loading) return <Loading label="Loading hiring partners…" />;
  if (list.loadError) return <ErrorState message={list.loadError} onRetry={list.load} />;

  const live = list.rows.filter((p) => p.published).length;
  const inTicker = list.rows.filter((p) => p.published && p.package_lpa).length;

  return (
    <div>
      <WebsiteTabs />
      <PageHeader
        title="Hiring partners"
        subtitle={`${live} in the hiring grid · ${inTicker} also in the placements ticker`}
        action={<button type="button" className="btn-cta" onClick={openNew}>Add a company</button>}
      />

      <div className="mb-5 rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm text-navy-600">
        Adding a <strong className="font-semibold">package</strong> puts a company in the scrolling
        ticker under the hero as well — &ldquo;Cred · ₹28 LPA&rdquo;. That reads as a named company
        having paid a MOP learner that salary, so only add one you can evidence. Leave it blank and
        the company still appears in the hiring grid.
      </div>

      {list.rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No companies"
            message="The hiring network section is hidden on the public site until you add one."
            action={<button type="button" className="btn-cta" onClick={openNew}>Add a company</button>}
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {list.rows.map((p, i) => (
            <li key={p.id} className={`card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center ${p.published ? '' : 'opacity-70'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-navy">{p.name}</h3>
                  {p.package_lpa && (
                    <span className="badge bg-teal-100 text-teal-700">{p.package_lpa} · in ticker</span>
                  )}
                  {!p.published && <span className="badge bg-navy-100 text-navy-600">Hidden</span>}
                </div>
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
                <button type="button" className="btn-ghost btn-sm" disabled={list.busyId === p.id}
                        onClick={() => openEdit(p)}>
                  Edit
                </button>
                <button type="button" className="btn-ghost btn-sm text-orange" disabled={list.busyId === p.id}
                        onClick={() => list.remove(p)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        title={editing?.id ? `Edit ${editing.name}` : 'Add a company'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" form="partner-form" className="btn-cta" disabled={list.saving}>
              {list.saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <form id="partner-form" onSubmit={submit} className="grid gap-4">
          <div>
            <label className="label" htmlFor="partner-name">Company name</label>
            <input id="partner-name" type="text" value={draft.name} onChange={set('name')}
                   aria-invalid={Boolean(err.name)}
                   className={`input ${err.name ? 'border-orange focus:border-orange focus:ring-orange' : ''}`} />
            {err.name && <p className="mt-1.5 text-xs font-medium text-orange-ink">{err.name}</p>}
          </div>

          <div>
            <label className="label" htmlFor="partner-package_lpa">Package</label>
            <input id="partner-package_lpa" type="text" value={draft.package_lpa}
                   onChange={set('package_lpa')} placeholder="₹20 LPA"
                   aria-invalid={Boolean(err.package_lpa)}
                   className={`input ${err.package_lpa ? 'border-orange focus:border-orange focus:ring-orange' : ''}`} />
            <p className={`mt-1.5 text-xs ${err.package_lpa ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
              {err.package_lpa || 'Optional. Fill this in and the company joins the placements ticker — only if you can evidence the offer.'}
            </p>
          </div>

          <div>
            <label className="label" htmlFor="partner-logo_url">Logo link</label>
            <input id="partner-logo_url" type="text" value={draft.logo_url} onChange={set('logo_url')}
                   placeholder="https://…" aria-invalid={Boolean(err.logo_url)}
                   className={`input ${err.logo_url ? 'border-orange focus:border-orange focus:ring-orange' : ''}`} />
            <p className={`mt-1.5 text-xs ${err.logo_url ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
              {err.logo_url || 'Optional. The grid shows the company name as text today; a logo link is stored for when image hosting is set up.'}
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

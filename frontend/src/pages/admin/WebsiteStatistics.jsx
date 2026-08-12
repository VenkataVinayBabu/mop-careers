import { useCallback, useState } from 'react';

import { EmptyState, ErrorState, Loading, Modal, PageHeader } from '../../components/ui';
import { applyStatistics } from '../../data/siteSettings';
import { Field } from './ContentInputs';
import ReorderButtons from './ReorderButtons';
import WebsiteTabs from './WebsiteTabs';
import { useContentList } from './websiteContent';

/*
 * Admin > Website > Statistics.
 *
 * The four figures under the hero and the four in the outcomes grid. One list,
 * split by section — they were two hardcoded arrays agreeing on three of their
 * four numbers, which is two places to remember when a figure changes.
 *
 * THESE ARE THE LEAST VERIFIED CLAIMS ON THE SITE. 1,050 placements, ₹47.6L,
 * 500 hiring partners, 87% placement rate. They came from mopcareers.in, and
 * nobody has checked them against records. Editing them here does not make
 * them true — it makes them correctable, which they were not before.
 */

const SECTIONS = [
  { id: 'hero', title: 'Under the hero',
    caption: 'The strip of figures near the top of the home page.' },
  { id: 'outcomes', title: 'Outcomes section',
    caption: 'The larger cards further down, under "Outcomes".' },
];

const BLANK = { section: 'hero', label: '', value: 0, prefix: '', suffix: '', published: true };

/* What the visitor will actually see, assembled the same way the public page
   does it. Worth showing back: "1050" with a "+" reads very differently from
   "1,050+", and the admin should not have to imagine it. */
function preview({ value, prefix, suffix }) {
  const n = Number(value) || 0;
  const decimals = String(n).includes('.') ? String(n).split('.')[1].length : 0;
  return `${prefix || ''}${n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix || ''}`;
}

export default function AdminWebsiteStatistics() {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(BLANK);

  const adopt = useCallback((all) => applyStatistics(all.filter((s) => s.published)), []);
  const list = useContentList('/admin/website/statistics', adopt, 'statistic', 'statistic');

  const openNew = (section) => () => {
    setEditing({ ...BLANK, section });
    setDraft({ ...BLANK, section });
    list.setErrors({});
  };
  const openEdit = (stat) => { setEditing(stat); setDraft({ ...BLANK, ...stat }); list.setErrors({}); };

  const submit = async (e) => {
    e.preventDefault();
    const ok = await list.save(editing, {
      section: draft.section,
      label: draft.label,
      value: Number(draft.value) || 0,
      prefix: draft.prefix,
      suffix: draft.suffix,
      published: draft.published,
    });
    if (ok) setEditing(null);
  };

  const err = list.errors;

  if (list.loading) return <Loading label="Loading statistics…" />;
  if (list.loadError) return <ErrorState message={list.loadError} onRetry={list.load} />;

  return (
    <div>
      <WebsiteTabs />
      <PageHeader
        title="Statistics"
        subtitle="The headline figures on the home page"
      />

      <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-ink">
        <strong className="font-semibold">These are the strongest claims on the site.</strong>{' '}
        The figures here came from mopcareers.in and have never been checked against MOP&apos;s own
        records. A placement count or a placement rate is the first thing a sceptical parent will
        ask you to back up — only publish what you can.
      </div>

      {SECTIONS.map((section) => {
        const rows = list.rows.filter((s) => s.section === section.id);
        return (
          <section key={section.id} className="mb-6">
            <div className="mb-2.5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-navy">{section.title}</h2>
                <p className="text-sm text-navy-500">{section.caption}</p>
              </div>
              <button type="button" className="btn-ghost btn-sm shrink-0" onClick={openNew(section.id)}>
                Add a figure
              </button>
            </div>

            {rows.length === 0 ? (
              <div className="card">
                <EmptyState
                  title="Nothing here"
                  message="This section is hidden on the public site until you add a figure."
                  action={
                    <button type="button" className="btn-cta" onClick={openNew(section.id)}>
                      Add a figure
                    </button>
                  }
                />
              </div>
            ) : (
              <ul className="space-y-2">
                {rows.map((s) => {
                  /* Reorder works across the whole table, so a row's index has
                     to be its position in the full list, not in this section. */
                  const index = list.rows.indexOf(s);
                  return (
                    <li key={s.id} className={`card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center ${s.published ? '' : 'opacity-70'}`}>
                      <span className="w-32 shrink-0 text-[1.4rem] font-extrabold tracking-tight text-navy">
                        {preview(s)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-navy-700">{s.label}</span>
                        {!s.published && (
                          <span className="ml-2 badge bg-navy-100 text-navy-600">Hidden</span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <ReorderButtons
                          index={index}
                          total={list.rows.length}
                          label={s.label}
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
                                onClick={() => list.remove({ ...s, name: s.label })}>
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <Modal
        open={editing !== null}
        title={editing?.id ? `Edit ${editing.label}` : 'Add a figure'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" form="stat-form" className="btn-cta" disabled={list.saving}>
              {list.saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <form id="stat-form" onSubmit={submit} className="grid gap-4">
          <div className="rounded-lg bg-navy-50 p-4 text-center">
            <span className="block text-[1.9rem] font-extrabold tracking-tight text-navy">
              {preview(draft)}
            </span>
            <span className="mt-1 block text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-navy-400">
              {draft.label || 'Label'}
            </span>
          </div>

          <div>
            <label className="label" htmlFor="stat-section">Where it appears</label>
            <select id="stat-section" className="input" value={draft.section}
                    onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}>
              {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>

          <Field id="stat-label" label="Label" max={80} value={draft.label} error={err.label}
                 onChange={(v) => setDraft((d) => ({ ...d, label: v }))}
                 hint="Shown under the number, in capitals." />

          <div>
            <label className="label" htmlFor="stat-value">Number</label>
            <input
              id="stat-value"
              type="number"
              step="0.1"
              min="0"
              className={`input ${err.value ? 'border-orange focus:border-orange focus:ring-orange' : ''}`}
              value={draft.value}
              onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
              aria-invalid={Boolean(err.value)}
            />
            <p className={`mt-1.5 text-xs ${err.value ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
              {err.value || 'Digits only — the counter animates up to this. Decimals are kept: 47.6 shows as 47.6.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="stat-prefix" label="Before the number" max={8} value={draft.prefix}
                   error={err.prefix} onChange={(v) => setDraft((d) => ({ ...d, prefix: v }))}
                   placeholder="₹" hint="Usually the rupee sign, or nothing." />
            <Field id="stat-suffix" label="After the number" max={8} value={draft.suffix}
                   error={err.suffix} onChange={(v) => setDraft((d) => ({ ...d, suffix: v }))}
                   placeholder="+" hint="Such as +, % or L." />
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

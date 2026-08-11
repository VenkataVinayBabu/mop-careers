import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { ErrorState, Loading, PageHeader } from '../../components/ui';
import { applyPrograms, refreshPublicContent, useFees } from '../../data/siteSettings';
import { Field, Repeater, TagList } from './ContentInputs';
import { fieldErrors } from './websiteContent';

/*
 * Admin > Website > Programs > one programme.
 *
 * A whole page rather than a modal, because a programme is a whole page: the
 * basics that put it on the home page, then everything its own page renders —
 * why, roles, a four-phase syllabus, technologies, projects and an FAQ.
 *
 * WHY THIS SCREEN MATTERS more than the others. Seven of the eight syllabi on
 * the live site were drafted in-session rather than by MOP: the phase content,
 * the salary bands, and the Placements Exit company lists, which are the
 * strongest claim on any page. Until now correcting one meant a developer.
 *
 * Every section of the detail block is optional. A programme with no syllabus
 * simply has no syllabus section on its page — nothing renders half-built.
 */

const CATEGORIES = [
  { id: '', label: 'None' },
  { id: 'ai', label: 'Data & AI' },
  { id: 'dev', label: 'Development' },
  { id: 'infra', label: 'Cloud & Security' },
  { id: 'mkt', label: 'Marketing' },
];

const BLANK_DETAIL = {
  headline: '', intro: '', highlights: [], why: [], roles: [],
  syllabus: [], technologies: [], projects: [], faq: [],
  // null means "use the standard fees", which is the normal case.
  fees: null,
};

const BLANK_FEES = {
  registration: '', registrationWas: '', registrationNote: '',
  tuition: '', tuitionWas: '', tuitionNote: '', emi: '',
};

const BLANK = {
  name: '', slug: '', category: '', badge: '', duration: '',
  ctc_avg: '', ctc_high: '', summary: '', for_whom: '', skills: [],
  featured: false, confirmed: true, published: true,
  detail: BLANK_DETAIL,
  // The training side. Not on the public page — see the section's own note.
  total_days: 45, curriculum: [],
};

function Section({ title, caption, children }) {
  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      {caption && <p className="mt-0.5 text-sm text-navy-500">{caption}</p>}
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

/* The two tones are written out rather than interpolated. Tailwind extracts
   class names by scanning source text, so `text-${tone}` produces a class that
   was never generated and silently does nothing. */
const CHECK_TONE = {
  teal: 'text-teal focus:ring-teal',
  orange: 'text-orange focus:ring-orange',
};

function Check({ checked, onChange, label, hint, tone = 'teal' }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-navy-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`mt-0.5 h-4 w-4 rounded border-navy-300 ${CHECK_TONE[tone] || CHECK_TONE.teal}`}
      />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-navy-400">{hint}</span>}
      </span>
    </label>
  );
}

/*
 * The day-by-day plan a new batch of this programme is created from.
 *
 * Deliberately not the Repeater used everywhere else on this page: these rows
 * are keyed by day number rather than by position, so the up/down arrows would
 * be a lie — the server keeps the list in day order however it arrives.
 *
 * Sparse on purpose. Only the days somebody has actually planned need a row;
 * every other day of the batch is created as an editable placeholder for the
 * teacher, which is how days 12-55 have always worked.
 */
function CurriculumTemplate({ totalDays, days, onChange }) {
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);
  const used = new Set(days.map((d) => d.day_number));
  let next = 1;
  while (used.has(next)) next += 1;

  const patchAt = (index, changes) =>
    onChange(days.map((d, i) => (i === index ? { ...d, ...changes } : d)));

  const overrun = sorted.filter((d) => d.day_number > totalDays);
  const duplicates = sorted.filter(
    (d, i) => i > 0 && d.day_number === sorted[i - 1].day_number,
  );

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-4">
        <div>
          <span className="label mb-0">Planned days</span>
          <p className="mt-0.5 text-xs text-navy-400">
            {days.length === 0
              ? `Nothing planned yet, so a new batch gets ${totalDays} placeholder days.`
              : `${days.length} of ${totalDays} days planned. The other ${Math.max(0, totalDays - days.length)} are created as placeholders.`}
          </p>
        </div>
      </div>

      {(overrun.length > 0 || duplicates.length > 0) && (
        <p className="mb-2 rounded-lg bg-orange-50 p-3 text-xs font-medium text-orange-ink">
          {overrun.length > 0
            ? `Day ${overrun[0].day_number} is past the end of a ${totalDays}-day programme. Raise the length or move the day.`
            : `Day ${duplicates[0].day_number} is planned twice.`}
        </p>
      )}

      <div className="space-y-2">
        {days.map((day, i) => (
          <div
            key={i}
            className="grid items-start gap-2 rounded-lg border border-navy-100 bg-navy-50/40 p-3 sm:grid-cols-[5.5rem_1fr_auto]"
          >
            <div>
              <label className="label text-xs" htmlFor={`day-n-${i}`}>Day</label>
              <input
                id={`day-n-${i}`}
                type="number"
                min={1}
                max={365}
                className="input"
                value={day.day_number}
                onChange={(e) =>
                  patchAt(i, { day_number: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </div>
            <div className="grid gap-2">
              <input
                aria-label={`Day ${day.day_number} topic`}
                className="input"
                maxLength={200}
                placeholder="Topic, e.g. Collections & Generics"
                value={day.topic}
                onChange={(e) => patchAt(i, { topic: e.target.value })}
              />
              <textarea
                aria-label={`Day ${day.day_number} description`}
                className="input"
                rows={2}
                maxLength={1000}
                placeholder="What the class covers. Optional."
                value={day.description}
                onChange={(e) => patchAt(i, { description: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(days.filter((_, j) => j !== i))}
              className="rounded px-2 py-1 text-xs font-semibold text-orange transition hover:bg-orange-50 sm:mt-6"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...days, { day_number: next, topic: '', description: '' }])}
        disabled={next > totalDays}
        className="btn-ghost btn-sm mt-3"
      >
        + Add day {next <= totalDays ? next : ''}
      </button>
    </div>
  );
}

export default function AdminWebsiteProgramEditor() {
  const { programId } = useParams();
  const isNew = programId === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [initial, setInitial] = useState(isNew ? BLANK : null);
  const [form, setForm] = useState(isNew ? BLANK : null);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  /* The standard fees, so ticking the override starts from them rather than
     from seven empty boxes. The admin app never renders the public header, so
     this is where the settings get asked for. */
  const standardFees = useFees();
  useEffect(() => {
    refreshPublicContent();
  }, []);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoadError('');
    try {
      const { data } = await api.get('/admin/website/programs');
      const found = data.find((p) => String(p.id) === String(programId));
      if (!found) {
        setLoadError('That programme no longer exists.');
        return;
      }
      const shaped = { ...BLANK, ...found, detail: { ...BLANK_DETAIL, ...(found.detail || {}) } };
      setInitial(shaped);
      setForm(shaped);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isNew, programId]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(
    () => Boolean(form && initial) && JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial],
  );

  /* Leaving a half-written syllabus behind by closing the tab would be a
     genuinely expensive mistake on this screen. */
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };
  const setDetail = (key) => (value) =>
    setForm((f) => ({ ...f, detail: { ...f.detail, [key]: value } }));

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const body = { ...form };
      // The server derives a slug from the name when one is not given. Sending
      // an empty string on create would fail min_length instead.
      if (isNew && !body.slug) delete body.slug;
      const { data } = isNew
        ? (await api.post('/admin/website/programs', body))
        : (await api.put(`/admin/website/programs/${programId}`, body));

      const shaped = { ...BLANK, ...data, detail: { ...BLANK_DETAIL, ...(data.detail || {}) } };
      setInitial(shaped);
      setForm(shaped);
      toast.success(`${data.name} saved. The public site is showing this now.`);

      // Keep the public store in step, then settle on the saved programme's
      // own URL so a reload after creating does not try to create again.
      try {
        const { data: all } = await api.get('/admin/website/programs');
        applyPrograms(all.filter((p) => p.published));
      } catch { /* the list screen will refresh it */ }

      if (isNew) navigate(`/admin/website/programs/${data.id}`, { replace: true });
    } catch (err) {
      const byField = fieldErrors(err);
      setErrors(byField);
      toast.error(
        Object.keys(byField).length
          ? 'Some fields need fixing — see the messages below.'
          : errorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading programme…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  const d = form.detail;

  return (
    <form onSubmit={save}>
      <PageHeader
        title={isNew ? 'Add a program' : form.name || 'Program'}
        subtitle={isNew ? 'It appears on the home page and gets its own page' : `/programs/${form.slug}`}
        action={
          <div className="flex gap-2">
            <Link to="/admin/website/programs" className="btn-ghost btn-sm">
              &larr; All programs
            </Link>
            {!isNew && form.published && (
              <a href={`/programs/${form.slug}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                View page &rarr;
              </a>
            )}
          </div>
        }
      />

      <div className="space-y-5 pb-4">
        <Section title="The basics" caption="What the card on the home page shows.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="p-name" label="Name" value={form.name} onChange={set('name')}
                   error={errors.name} max={120} />
            <Field id="p-slug" label="Web address" value={form.slug} onChange={set('slug')}
                   error={errors.slug} max={80}
                   placeholder={isNew ? 'left blank, made from the name' : undefined}
                   hint={`The page will be at /programs/${form.slug || '…'}. Changing it breaks any existing link.`} />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="p-category">Category</label>
              <select id="p-category" className="input" value={form.category}
                      onChange={(e) => set('category')(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-navy-400">Groups it on the home page.</p>
            </div>
            <Field id="p-badge" label="Badge" value={form.badge} onChange={set('badge')}
                   error={errors.badge} max={40} placeholder="Most popular"
                   hint="Small pill on the card. Blank for none." />
            <Field id="p-duration" label="Duration" value={form.duration} onChange={set('duration')}
                   error={errors.duration} max={60} placeholder="6–12 months" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="p-ctc_avg" label="Average package" value={form.ctc_avg} onChange={set('ctc_avg')}
                   error={errors.ctc_avg} max={60} placeholder="₹12 LPA avg"
                   hint="Shown on the card and the programme page. Only a figure you can evidence." />
            <Field id="p-ctc_high" label="Highest package" value={form.ctc_high} onChange={set('ctc_high')}
                   error={errors.ctc_high} max={60} placeholder="₹42 LPA highest" hint="Optional." />
          </div>

          <Field id="p-summary" label="Summary" rows={3} max={1000} value={form.summary}
                 onChange={set('summary')} error={errors.summary}
                 hint="One or two sentences on the card." />
          <Field id="p-for_whom" label="Who it is for" rows={2} max={600} value={form.for_whom}
                 onChange={set('for_whom')} error={errors.for_whom} />

          <TagList id="p-skills" label="Skills" value={form.skills} onChange={set('skills')}
                   hint="Four or five short tags on the card, e.g. Python, ML, MLOps." />

          <div className="grid gap-2.5 rounded-lg bg-navy-50 p-4">
            <Check checked={form.published} onChange={set('published')}
                   label="Show on the public site"
                   hint="Unticked, it disappears from the listing, the enquiry dropdown and every count." />
            <Check checked={form.featured} onChange={set('featured')}
                   label="Feature it"
                   hint="Featured programmes get the two large cards at the top of the list." />
            <Check checked={form.confirmed} onChange={set('confirmed')} tone="orange"
                   label="MOP confirms it runs this"
                   hint="Admin-facing only. Untick for a programme nobody has confirmed yet — it flags the row on the list." />
          </div>
        </Section>

        <Section title="Page header" caption="The top of the programme's own page.">
          <Field id="p-headline" label="Headline" value={d.headline} onChange={setDetail('headline')}
                 max={200} hint="Falls back to the programme name if blank." />
          <Field id="p-intro" label="Introduction" rows={4} max={1200} value={d.intro}
                 onChange={setDetail('intro')} hint="Falls back to the summary if blank." />
          <TagList id="p-highlights" label="Highlights" value={d.highlights}
                   onChange={setDetail('highlights')}
                   hint="Ticked lines under the introduction. One sentence each." />
        </Section>

        <Section title="Why this programme" caption="The card grid explaining what makes it worth doing.">
          <Repeater
            label="Reasons" itemLabel="Reason" addLabel="Add a reason"
            items={d.why} onChange={setDetail('why')} blank={{ title: '', body: '' }}
            renderItem={(item, i, patch) => (
              <div className="grid gap-3">
                <Field id={`why-t-${i}`} label="Title" max={120} value={item.title}
                       onChange={(v) => patch({ title: v })} />
                <Field id={`why-b-${i}`} label="Body" rows={2} max={600} value={item.body}
                       onChange={(v) => patch({ body: v })} />
              </div>
            )}
          />
        </Section>

        <Section title="Roles you can go for" caption="Job titles, salary bands and example employers.">
          <Repeater
            label="Roles" itemLabel="Role" addLabel="Add a role"
            items={d.roles} onChange={setDetail('roles')}
            blank={{ title: '', salary: '', body: '', companies: [] }}
            renderItem={(item, i, patch) => (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id={`role-t-${i}`} label="Job title" max={120} value={item.title}
                         onChange={(v) => patch({ title: v })} />
                  <Field id={`role-s-${i}`} label="Salary band" max={60} value={item.salary}
                         onChange={(v) => patch({ salary: v })} placeholder="₹8L – ₹18L"
                         hint="A market estimate unless you have MOP's own placement data." />
                </div>
                <Field id={`role-b-${i}`} label="What the job is" rows={2} max={600} value={item.body}
                       onChange={(v) => patch({ body: v })} />
                <TagList id={`role-c-${i}`} label="Example employers" value={item.companies}
                         onChange={(v) => patch({ companies: v })}
                         hint="Companies that hire for this role — not a claim that MOP placed someone there." />
              </div>
            )}
          />
        </Section>

        <Section
          title="Syllabus"
          caption="Phases in order. One is open at a time on the page, so the titles are the outline someone skims."
        >
          <Repeater
            label="Phases" itemLabel="Phase" addLabel="Add a phase"
            items={d.syllabus} onChange={setDetail('syllabus')}
            blank={{ title: '', body: '', topics: [], exit: [] }}
            renderItem={(item, i, patch) => (
              <div className="grid gap-3">
                <Field id={`syl-t-${i}`} label="Phase title" max={160} value={item.title}
                       onChange={(v) => patch({ title: v })} />
                <Field id={`syl-b-${i}`} label="What it covers" rows={2} max={800} value={item.body}
                       onChange={(v) => patch({ body: v })} />
                <TagList id={`syl-top-${i}`} label="Topics" value={item.topics}
                         onChange={(v) => patch({ topics: v })} />
                <TagList id={`syl-e-${i}`} label="Placements exit" value={item.exit}
                         onChange={(v) => patch({ exit: v })}
                         hint="The calibre of employer a learner is ready for by the end of this phase. This is the strongest claim on the page — only list companies MOP can stand behind." />
              </div>
            )}
          />
        </Section>

        <Section
          title="Class curriculum"
          caption="Internal — none of this appears on the public site. It is the day-by-day plan a new batch of this programme is created from."
        >
          <div className="grid gap-5 sm:grid-cols-[12rem_1fr] sm:items-start">
            <div>
              <label className="label" htmlFor="p-total-days">Class days</label>
              <input
                id="p-total-days"
                type="number"
                min={1}
                max={365}
                className="input"
                value={form.total_days}
                onChange={(e) => set('total_days')(Math.max(1, Number(e.target.value) || 1))}
              />
              <p className="mt-1.5 text-xs text-navy-400">How long a batch runs.</p>
            </div>
            <p className="rounded-lg bg-navy-50 p-4 text-xs text-navy-500 sm:mt-6">
              This is a template for the <strong>next</strong> batch. Batches already
              running keep the days they were created with, along with their dates,
              recordings and attendance — editing here never touches a class in progress.
            </p>
          </div>

          <CurriculumTemplate
            totalDays={form.total_days}
            days={form.curriculum}
            onChange={set('curriculum')}
          />
        </Section>

        <Section title="Technologies" caption="The tool logos strip on the programme page.">
          <TagList id="p-technologies" value={d.technologies} onChange={setDetail('technologies')}
                   hint="Everything taught, in the order it is met." />
        </Section>

        <Section title="Projects" caption="What a learner actually builds.">
          <Repeater
            label="Projects" itemLabel="Project" addLabel="Add a project"
            items={d.projects} onChange={setDetail('projects')}
            blank={{ title: '', body: '', tech: [] }}
            renderItem={(item, i, patch) => (
              <div className="grid gap-3">
                <Field id={`proj-t-${i}`} label="Title" max={160} value={item.title}
                       onChange={(v) => patch({ title: v })} />
                <Field id={`proj-b-${i}`} label="What they build" rows={2} max={800} value={item.body}
                       onChange={(v) => patch({ body: v })} />
                <TagList id={`proj-tech-${i}`} label="Technologies" value={item.tech}
                         onChange={(v) => patch({ tech: v })} />
              </div>
            )}
          />
        </Section>

        <Section
          title="Fees"
          caption="This programme uses the standard fees from Website > Settings unless you override them here."
        >
          <Check
            checked={Boolean(d.fees)}
            onChange={(on) => setDetail('fees')(on ? { ...BLANK_FEES, ...standardFees } : null)}
            label="This programme charges something different"
            hint="Ticking it starts from the standard figures so you only change what differs. Untick to go back to the standard, whatever it becomes later."
          />

          {d.fees && (
            <div className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="fee-reg" label="Registration fee" max={60} value={d.fees.registration}
                       onChange={(v) => setDetail('fees')({ ...d.fees, registration: v })} />
                <Field id="fee-reg-was" label="Registration — was" max={60} value={d.fees.registrationWas}
                       onChange={(v) => setDetail('fees')({ ...d.fees, registrationWas: v })}
                       hint="Struck through. Blank for no strike-through." />
              </div>
              <Field id="fee-reg-note" label="Registration note" max={200} value={d.fees.registrationNote}
                     onChange={(v) => setDetail('fees')({ ...d.fees, registrationNote: v })} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="fee-tui" label="Tuition" max={60} value={d.fees.tuition}
                       onChange={(v) => setDetail('fees')({ ...d.fees, tuition: v })} />
                <Field id="fee-tui-was" label="Tuition — was" max={60} value={d.fees.tuitionWas}
                       onChange={(v) => setDetail('fees')({ ...d.fees, tuitionWas: v })} />
              </div>
              <Field id="fee-tui-note" label="Tuition note" max={200} value={d.fees.tuitionNote}
                     onChange={(v) => setDetail('fees')({ ...d.fees, tuitionNote: v })} />
              <Field id="fee-emi" label="EMI option" max={60} value={d.fees.emi}
                     onChange={(v) => setDetail('fees')({ ...d.fees, emi: v })} />
              <p className="text-xs text-navy-400">
                Any field left blank here falls back to the standard fee for it, so you can
                override the tuition alone.
              </p>
            </div>
          )}
        </Section>

        <Section
          title="Questions about this programme"
          caption="Shown above the questions that appear on every programme page, so there is no need to repeat those."
        >
          <Repeater
            label="Questions" itemLabel="Question" addLabel="Add a question"
            items={d.faq.map(([q, a]) => ({ q: q || '', a: a || '' }))}
            onChange={(rows) => setDetail('faq')(rows.map((r) => [r.q, r.a]))}
            blank={{ q: '', a: '' }}
            renderItem={(item, i, patch) => (
              <div className="grid gap-3">
                <Field id={`faq-q-${i}`} label="Question" max={200} value={item.q}
                       onChange={(v) => patch({ q: v })} />
                <Field id={`faq-a-${i}`} label="Answer" rows={3} max={1000} value={item.a}
                       onChange={(v) => patch({ a: v })} />
              </div>
            )}
          />
        </Section>
      </div>

      {/* Sticky, because this form is several screens long and the save button
          should never be a scroll away. */}
      <div className="sticky bottom-0 z-10 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 bg-white/95 p-4 shadow-card backdrop-blur">
        <p className="text-sm text-navy-500">
          {dirty
            ? 'Unsaved changes.'
            : isNew
              ? 'Nothing saved yet.'
              : 'Everything here is live on the public site.'}
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" disabled={!dirty || saving}
                  onClick={() => { setForm(initial); setErrors({}); }}>
            Discard
          </button>
          <button type="submit" className="btn-cta" disabled={saving || (!isNew && !dirty)}>
            {saving ? 'Saving…' : isNew ? 'Create program' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

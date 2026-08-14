import { useEffect, useState } from 'react';

import { PublicFloats, PublicFooter, PublicHeader, useHashScroll } from './PublicChrome';
import { api, errorMessage } from '../../api/client';

/*
 * The careers page, matching what MOP publishes at
 * mopcareers.in/careers.php — the same sections, benefits and openings.
 *
 * The content is hardcoded here rather than coming from a table, unlike the
 * rest of the marketing site. That is a deliberate first cut: openings change
 * a few times a year, not weekly, and a `job_openings` table plus its admin
 * screen is a bigger job than the page itself. When roles start changing often
 * enough that editing this file is a nuisance, that is the signal to lift
 * OPENINGS into Admin > Website the way programmes and mentors already are.
 *
 * Every figure below — salary bands, years of experience, the student count —
 * is MOP's own published copy, carried across as-is. None of it is verified.
 */

const BENEFITS = [
  {
    title: 'Impactful Work',
    body: "Every day, you'll be helping students transform their careers. Your work directly impacts thousands of lives.",
  },
  {
    title: 'Career Growth',
    body: "Grow your career with us. We invest in our team's professional development and advancement.",
  },
  {
    title: 'Great Team',
    body: 'Work with talented, passionate individuals who are committed to excellence and continuous learning.',
  },
  {
    title: 'Competitive Benefits',
    body: 'Competitive salary, health insurance, flexible work arrangements, and generous leave policies.',
  },
  {
    title: 'Modern Tech Stack',
    body: 'Work with latest technologies and tools. We believe in using the best tools for the job.',
  },
  {
    title: 'Work-Life Balance',
    body: 'We value work-life balance. Flexible hours, remote work options, and a supportive culture.',
  },
];

/* The openings themselves now come from the API — Bala adds and closes roles
   at Admin > Website > Openings rather than asking for a deploy. A role is
   taken down by unpublishing it, so it can come back next quarter without
   being retyped. */

/*
 * The application form, as a dialog over the page.
 *
 * It posts to the API rather than opening a mail client: SMTP is not
 * configured yet, so a mailto would be the only record of a candidate and an
 * unsent mail would lose them entirely. The row lands in `job_applications`
 * whether or not the notification goes out.
 */
function ApplyModal({ position, onClose }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', years_experience: '',
    resume_url: '', portfolio_url: '', cover_letter: '', agreed_to_terms: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    /* The page behind must not scroll while this is open, or a phone drags the
       form off screen as you reach the bottom of it. */
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: k === 'agreed_to_terms' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.agreed_to_terms) {
      setError('Please accept the terms and privacy policy to apply.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/public/job-applications', { position, ...form });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-navy-900/60 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Apply for ${position}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-pop">
        <div className="flex items-center justify-between gap-4 border-b border-navy-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-navy">Apply for Position</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-400 transition hover:bg-navy-50 hover:text-navy"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <p className="text-lg font-semibold text-navy">Application received</p>
            <p className="mx-auto mt-2 max-w-[380px] text-[0.9rem] text-navy-400">
              Thanks for applying for {position}. The MOP Careers team will be in touch if
              there is a fit.
            </p>
            <button type="button" onClick={onClose} className="pbtn-navy mt-7">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5" noValidate>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="ap-position">Position</label>
                {/* Read-only rather than a dropdown: you got here by clicking a
                    specific role, and changing it in the form would silently
                    apply for something else. */}
                <input id="ap-position" className="input bg-navy-50" value={position} readOnly />
              </div>
              <div>
                <label className="label" htmlFor="ap-name">
                  Full Name <span className="text-orange">*</span>
                </label>
                <input id="ap-name" className="input" required value={form.name} onChange={set('name')} />
              </div>
              <div>
                <label className="label" htmlFor="ap-email">
                  Email <span className="text-orange">*</span>
                </label>
                <input id="ap-email" type="email" className="input" required value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label className="label" htmlFor="ap-phone">
                  Phone Number <span className="text-orange">*</span>
                </label>
                <input id="ap-phone" className="input" required value={form.phone} onChange={set('phone')} />
              </div>
              <div>
                <label className="label" htmlFor="ap-yoe">
                  Years of Experience <span className="text-orange">*</span>
                </label>
                <input id="ap-yoe" className="input" required value={form.years_experience} onChange={set('years_experience')} />
              </div>
              <div>
                <label className="label" htmlFor="ap-resume">
                  Resume link <span className="text-orange">*</span>
                </label>
                <input
                  id="ap-resume"
                  className="input"
                  required
                  placeholder="https://drive.google.com/..."
                  value={form.resume_url}
                  onChange={set('resume_url')}
                />
                {/* The single most common way this fails: a Drive link still
                    restricted to the applicant's own account, so whoever opens
                    it gets "You need access" and the candidate is lost without
                    either side knowing. One line of help prevents it. */}
                <p className="mt-1.5 text-[0.78rem] text-navy-400">
                  Google Drive, Dropbox, OneDrive or your own site. Please set sharing to
                  &ldquo;Anyone with the link can view&rdquo;, or we won&apos;t be able to open it.
                </p>
              </div>
              <div>
                <label className="label" htmlFor="ap-portfolio">Portfolio/Website (if applicable)</label>
                <input id="ap-portfolio" className="input" placeholder="https://example.com" value={form.portfolio_url} onChange={set('portfolio_url')} />
              </div>
              <div>
                <label className="label" htmlFor="ap-cover">Cover Letter (Optional)</label>
                <textarea id="ap-cover" rows={4} className="input" placeholder="Tell us why you're a great fit..." value={form.cover_letter} onChange={set('cover_letter')} />
              </div>

              <label className="flex items-start gap-2.5 text-[0.87rem] text-navy-600">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy-300 text-teal focus:ring-teal"
                  checked={form.agreed_to_terms}
                  onChange={set('agreed_to_terms')}
                />
                I agree to the terms and privacy policy
              </label>

              {error && (
                <p className="rounded-lg bg-orange-50 p-3 text-[0.85rem] text-orange-700">{error}</p>
              )}
            </div>

            <button type="submit" disabled={saving} className="pbtn-primary mt-6 w-full">
              {saving ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Careers() {
  useHashScroll();
  const [applyingFor, setApplyingFor] = useState(null);
  const [openings, setOpenings] = useState(null);   // null = still loading

  useEffect(() => {
    let cancelled = false;
    api
      .get('/public/openings')
      .then(({ data }) => !cancelled && setOpenings(data))
      /* An empty list on failure, not a crash: the rest of the page — why
         join, the benefits, the open application — is still worth reading if
         the API is asleep or down. */
      .catch(() => !cancelled && setOpenings([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-paper">
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="bg-navy-900 py-20 text-center sm:py-24">
          <div className="mx-auto max-w-[820px] px-6">
            <span className="inline-flex rounded-full bg-orange px-3 py-1 text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-white">
              Join Our Team
            </span>
            <h1 className="mt-5 text-3xl font-bold text-white sm:text-5xl">
              Careers at MOP Careers
            </h1>
            <p className="mx-auto mt-4 max-w-[620px] text-navy-200">
              Help us transform lives through education. Join a team of passionate professionals
              dedicated to changing the future of learning.
            </p>
            <a href="#openings" className="pbtn-primary mt-8 inline-flex">
              View Openings &rarr;
            </a>
          </div>
        </section>

        {/* Why join */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">
              Why Join MOP Careers?
            </h2>
            <p className="mt-3 text-center text-navy-400">
              Be part of a mission-driven organization transforming education
            </p>

            <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className="rounded-2xl border border-navy-100 bg-white p-6">
                  <h3 className="font-semibold text-navy">{b.title}</h3>
                  <p className="mt-2 text-[0.9rem] text-navy-400">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Openings — the anchor MOP's own link points at. */}
        <section id="openings" className="scroll-mt-24 bg-navy-50 py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">
              Open Positions
            </h2>
            <p className="mt-3 text-center text-navy-400">
              Check out the opportunities available to join our team
            </p>

            {openings === null ? (
              <p className="mt-11 text-center text-navy-400">Loading open positions…</p>
            ) : openings.length === 0 ? (
              /* A real answer, not a broken page: MOP is between hires, and the
                 open application below is still the thing to do. */
              <div className="mx-auto mt-11 max-w-[520px] rounded-2xl border border-navy-100 bg-white p-7 text-center">
                <p className="font-semibold text-navy">No open positions right now</p>
                <p className="mt-2 text-[0.9rem] text-navy-400">
                  We are not advertising a role at the moment — send your resume anyway and we
                  will get in touch when something fits.
                </p>
              </div>
            ) : (
            <div className="mt-11 grid gap-5">
              {openings.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-navy-100 bg-white p-6 sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-navy">{job.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-[0.75rem] font-semibold">
                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-ink">
                          {job.department}
                        </span>
                        <span className="rounded-full bg-navy-50 px-2.5 py-1 text-navy-500">
                          {job.location}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApplyingFor(job.name)}
                      className="pbtn-navy pbtn-sm shrink-0"
                    >
                      Apply Now &rarr;
                    </button>
                  </div>

                  <p className="mt-4 text-[0.9rem] text-navy-400">{job.description}</p>

                  <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[0.85rem]">
                    <div className="flex gap-2">
                      <dt className="text-navy-400">Experience:</dt>
                      <dd className="font-medium text-navy">{job.experience}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-navy-400">Salary:</dt>
                      <dd className="font-medium text-navy">{job.salary}</dd>
                    </div>
                  </dl>

                  <ul className="mt-4 flex flex-wrap gap-2">
                    {job.skills.map((s) => (
                      <li
                        key={s}
                        className="rounded-md bg-navy-50 px-2.5 py-1 text-[0.75rem] font-medium text-navy-500"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            )}

            <div className="mt-10 text-center">
              <p className="text-navy-500">
                Don&apos;t see a position that fits? Send us your resume and let&apos;s talk!
              </p>
              <button
                type="button"
                onClick={() => setApplyingFor('Open application')}
                className="pbtn-outline mt-4 inline-flex"
              >
                Send Your Resume &rarr;
              </button>
            </div>
          </div>
        </section>

        {/* Closing band */}
        <section className="bg-navy-900 py-16 text-center sm:py-20">
          <div className="mx-auto max-w-[720px] px-6">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to Make an Impact?
            </h2>
            <p className="mt-3 text-navy-200">
              Join us in transforming lives through education. Let&apos;s build the future together.
            </p>
            <button
              type="button"
              onClick={() => setApplyingFor('Open application')}
              className="pbtn-primary mt-7 inline-flex"
            >
              Send Your Resume &rarr;
            </button>
          </div>
        </section>
      </main>

      <PublicFooter />
      <PublicFloats />

      {applyingFor && (
        <ApplyModal position={applyingFor} onClose={() => setApplyingFor(null)} />
      )}
    </div>
  );
}

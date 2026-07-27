import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import Logo from '../../components/Logo';
import { Spinner } from '../../components/ui';
import { PROGRAMMES, PROGRAMME_OPTIONS, accentClasses } from '../../data/programmes';

/*
 * Public marketing site — no authentication anywhere on this page.
 * The only network call is the enquiry POST, which is a public endpoint.
 *
 * Durations and start dates are deliberately not shown anywhere here.
 */

const NAV = [
  { href: '#about', label: 'About' },
  { href: '#programmes', label: 'Programmes' },
  { href: '#structure', label: 'How it works' },
  { href: '#outcomes', label: 'Outcomes' },
  { href: '#enquire', label: 'Enquire' },
];

const HIGHLIGHTS = [
  { stat: `${PROGRAMMES.length}`, label: 'Career-track programmes' },
  { stat: 'Live', label: 'Instructor-led classes' },
  { stat: '1:1', label: 'Mentor support throughout' },
  { stat: '100%', label: 'Placement assistance' },
];

function EnquiryForm() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    programme: '',
    message: '',
  });
  const [status, setStatus] = useState({ state: 'idle', text: '' });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ state: 'sending', text: '' });
    try {
      const { data } = await api.post('/public/enquiries', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        programme: form.programme || null,
        message: form.message.trim(),
      });
      setStatus({ state: 'sent', text: data.message });
      setForm({ name: '', phone: '', email: '', programme: '', message: '' });
    } catch (err) {
      setStatus({ state: 'error', text: errorMessage(err) });
    }
  };

  if (status.state === 'sent') {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-lift">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-2xl text-teal">
          &#10003;
        </div>
        <h3 className="text-lg font-semibold text-navy">Enquiry received</h3>
        <p className="mt-2 text-sm text-navy-500">{status.text}</p>
        <button
          type="button"
          onClick={() => setStatus({ state: 'idle', text: '' })}
          className="btn-ghost mt-6"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const busy = status.state === 'sending';

  return (
    <form onSubmit={submit} className="rounded-xl bg-white p-6 shadow-lift sm:p-8" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="en-name">Full name</label>
          <input id="en-name" className="input" required value={form.name}
                 onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="en-phone">Phone</label>
          <input id="en-phone" className="input" required placeholder="9876543210"
                 value={form.phone}
                 onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="en-email">Email</label>
        <input id="en-email" type="email" className="input" required value={form.email}
               onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="en-programme">Which programme?</label>
        <select id="en-programme" className="input" value={form.programme}
                onChange={(e) => setForm({ ...form, programme: e.target.value })}>
          <option value="">Select a programme…</option>
          {PROGRAMME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="en-message">Your message</label>
        <textarea id="en-message" rows={4} className="input" required
                  placeholder="Tell us what you'd like to know — fees, eligibility, schedule…"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>

      {status.state === 'error' && (
        <div role="alert"
             className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          {status.text}
        </div>
      )}

      <button type="submit" disabled={busy} className="btn-cta mt-5 w-full">
        {busy && <Spinner className="h-4 w-4" />}
        {busy ? 'Sending…' : 'Send enquiry'}
      </button>
      <p className="mt-3 text-center text-xs text-navy-400">
        We&apos;ll get back to you within one working day.
      </p>
    </form>
  );
}

function ProgrammeCard({ programme }) {
  const a = accentClasses(programme.accent);
  return (
    <div className={`card border-t-4 ${a.bar} flex h-full flex-col p-6`}>
      <span className={`inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold ${a.chip}`}>
        {programme.name}
      </span>
      <h3 className="mt-3 text-lg font-bold text-navy">{programme.tagline}</h3>
      <p className="mt-2 text-sm text-navy-500">{programme.description}</p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
          What you&apos;ll cover
        </p>
        <ul className="mt-2 space-y-1.5">
          {programme.modules.map((m) => (
            <li key={m} className="flex gap-2 text-sm text-navy-600">
              <span className={a.dot}>&middot;</span>{m}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-5">
        <p className="text-xs text-navy-400">
          <span className="font-semibold text-navy-500">Who it&apos;s for: </span>
          {programme.forWhom}
        </p>
        <a href="#enquire" className="btn-cta btn-sm mt-4 w-full">
          Enquire about {programme.name}
        </a>
      </div>
    </div>
  );
}

export default function Landing() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = 'MOP Careers — Career-track technology programmes';
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ---------------------------------------------------------- header */}
      <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top"><Logo size="md" /></a>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}
                 className="text-sm font-medium text-navy-600 transition hover:text-teal">
                {n.label}
              </a>
            ))}
            <Link to="/login" className="btn-cta btn-sm">Login</Link>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <Link to="/login" className="btn-cta btn-sm">Login</Link>
            <button type="button" onClick={() => setOpen((v) => !v)}
                    aria-label="Toggle navigation menu"
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-600 hover:bg-navy-50">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-navy-100 bg-white px-4 py-3 md:hidden">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setOpen(false)}
                 className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-600 hover:bg-navy-50">
                {n.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section id="top" className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-teal/20 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-teal-200">
              Career-track technology programmes
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-5xl">
              Train for a <span className="text-teal-300">software career</span> that
              actually starts
            </h1>
            <p className="mt-5 max-w-2xl text-base text-navy-200 sm:text-lg">
              Choose your track — Python Full Stack, Java Full Stack or Gen AI. Every
              programme pairs a structured course with a hands-on internship, mentor
              support, mock interviews and placement assistance.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#programmes" className="btn-cta">Explore programmes</a>
              <a href="#enquire" className="btn inline-flex border border-navy-400 text-white hover:bg-navy-600">
                Enquire now
              </a>
            </div>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-navy-600 pt-8 sm:grid-cols-4">
            {HIGHLIGHTS.map((o) => (
              <div key={o.label}>
                <dt className="text-2xl font-bold text-teal-300 sm:text-3xl">{o.stat}</dt>
                <dd className="mt-1 text-xs text-navy-300 sm:text-sm">{o.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ----------------------------------------------------------- about */}
      <section id="about" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-bold text-navy sm:text-3xl">About MOP Careers</h2>
            <p className="mt-4 text-navy-500">
              MOP Careers is a training institute for people who want to move into
              software and need a structured, accountable path to get there.
            </p>
            <p className="mt-3 text-navy-500">
              We run a small number of career-track programmes and run them properly:
              small batches, a syllabus mapped out in advance, daily class recordings and
              notes, attendance you can actually see, and a mentor who knows your name.
            </p>
            <p className="mt-3 text-navy-500">
              Every student gets a personal dashboard tracking their progress from
              enrolment through to an offer letter.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { t: 'Structured syllabus', d: 'Every session mapped out in advance — no improvised lessons.' },
              { t: 'Never miss a class', d: 'Every session recorded, with downloadable notes.' },
              { t: 'Real internship', d: 'Build production-style software after the course.' },
              { t: 'Interview ready', d: 'Resume scoring, mock interviews and placement support.' },
            ].map((c) => (
              <div key={c.t} className="card p-5">
                <h3 className="font-semibold text-navy">{c.t}</h3>
                <p className="mt-1.5 text-sm text-navy-400">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ programmes */}
      <section id="programmes" className="bg-navy-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-navy sm:text-3xl">Our programmes</h2>
          <p className="mt-3 max-w-2xl text-navy-500">
            Pick the track that matches where you want to work. Talk to us if you&apos;re
            not sure which one suits you.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PROGRAMMES.map((p) => (
              <ProgrammeCard key={p.id} programme={p} />
            ))}
          </div>

          <p className="mt-8 text-sm text-navy-400">
            Looking for something not listed here?{' '}
            <a href="#enquire" className="font-semibold text-teal hover:text-teal-700">
              Ask us
            </a>
            .
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- structure */}
      <section id="structure" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold text-navy sm:text-3xl">How it works</h2>
        <p className="mt-3 max-w-2xl text-navy-500">
          Every programme follows the same two-stage shape.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="card border-t-4 border-t-teal p-6 sm:p-8">
            <span className="badge-done">Stage one</span>
            <h3 className="mt-3 text-xl font-bold text-navy">The course</h3>
            <p className="mt-2 text-sm text-navy-500">
              Live instructor-led classes working through the syllabus for your track.
              Each session has a defined topic, a recording, notes and tracked attendance.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-navy-600">
              {['Live instructor-led sessions',
                'Recordings and notes for every class',
                'Attendance and progress tracking',
                'Doubt support between classes'].map((i) => (
                <li key={i} className="flex gap-2"><span className="text-teal">&#10003;</span>{i}</li>
              ))}
            </ul>
          </div>

          <div className="card border-t-4 border-t-orange p-6 sm:p-8">
            <span className="badge-warn">Stage two</span>
            <h3 className="mt-3 text-xl font-bold text-navy">The internship</h3>
            <p className="mt-2 text-sm text-navy-500">
              A hands-on internship applying what you learned to real project work,
              running alongside placement preparation.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-navy-600">
              {['Project work with code review',
                'ATS resume builder and scoring',
                'AI-assisted mock interviews',
                'Placement assistance and referrals'].map((i) => (
                <li key={i} className="flex gap-2"><span className="text-orange">&#10003;</span>{i}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-sm text-navy-400">
          Schedules and start dates vary by programme and batch —{' '}
          <a href="#enquire" className="font-semibold text-teal hover:text-teal-700">
            get in touch
          </a>{' '}
          for current dates.
        </p>
      </section>

      {/* -------------------------------------------------------- outcomes */}
      <section id="outcomes" className="bg-navy-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-navy sm:text-3xl">Outcomes</h2>
          <p className="mt-3 max-w-2xl text-navy-500">
            What students go on to do after the programme.
          </p>

          {/* Placeholder content — to be replaced with real figures. */}
          <div className="mt-8 rounded-lg border border-navy-200 bg-white px-4 py-3 text-sm text-navy-500">
            Indicative figures shown below. Verified batch-wise placement statistics will be
            published here.
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { stat: '6–9 LPA', label: 'Typical fresher package range' },
              { stat: '4', label: 'Interview rounds prepared for' },
              { stat: '1:1', label: 'Mock interview feedback' },
            ].map((o) => (
              <div key={o.label} className="card p-6 text-center">
                <p className="text-3xl font-bold text-teal">{o.stat}</p>
                <p className="mt-2 text-sm text-navy-500">{o.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { role: 'Full Stack Developer', where: 'Product and services companies' },
              { role: 'Backend Developer', where: 'Python, Java and Spring Boot teams' },
              { role: 'Software Engineer Trainee', where: 'Graduate engineering programmes' },
              { role: 'AI Application Developer', where: 'Teams building LLM-powered products' },
            ].map((r) => (
              <div key={r.role} className="card flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 font-bold text-teal">
                  &rarr;
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{r.role}</p>
                  <p className="text-sm text-navy-400">{r.where}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- enquire */}
      <section id="enquire" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-bold text-navy sm:text-3xl">Enquire now</h2>
            <p className="mt-3 text-navy-500">
              Tell us which programme interests you and what you&apos;d like to know.
              Someone from the MOP Careers team will get back to you.
            </p>
            <div className="mt-6 space-y-3 text-sm text-navy-600">
              {['No prior programming experience required',
                'Batches for both freshers and working professionals',
                'Ask about fees, schedules, eligibility or the internship'].map((i) => (
                <p key={i} className="flex gap-2"><span className="text-teal">&#10003;</span>{i}</p>
              ))}
            </div>
            <p className="mt-8 text-sm text-navy-400">
              Already enrolled?{' '}
              <Link to="/login" className="font-semibold text-teal hover:text-teal-700">
                Sign in to your dashboard
              </Link>
            </p>
          </div>

          <EnquiryForm />
        </div>
      </section>

      {/* ---------------------------------------------------------- footer */}
      <footer className="bg-navy py-10 text-navy-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo variant="light" size="sm" />
            <p className="mt-2 text-xs">Career-track technology programmes</p>
          </div>
          <div className="flex flex-wrap gap-5 text-xs">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="transition hover:text-white">{n.label}</a>
            ))}
            <Link to="/login" className="transition hover:text-white">Login</Link>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-navy-600 px-4 pt-6 text-xs sm:px-6">
          &copy; {new Date().getFullYear()} MOP Careers. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import Logo from '../../components/Logo';
import { Spinner } from '../../components/ui';

/*
 * Public marketing site — no authentication anywhere on this page.
 * The only network call is the enquiry POST, which is a public endpoint.
 */

const NAV = [
  { href: '#about', label: 'About' },
  { href: '#programme', label: 'Programme' },
  { href: '#curriculum', label: 'Curriculum' },
  { href: '#outcomes', label: 'Outcomes' },
  { href: '#enquire', label: 'Enquire' },
];

// Days 1-11 are the fixed, pre-seeded syllabus. Later days are grouped into
// indicative modules because instructors finalise them per batch.
const CURRICULUM = [
  {
    range: 'Days 1–11',
    title: 'Python Fundamentals',
    fixed: true,
    items: [
      'Intro to Python & Setup',
      'Variables & Data Types',
      'Operators',
      'Strings',
      'Lists',
      'Tuples & Sets',
      'Dictionaries',
      'Conditionals',
      'Loops',
      'Loop Control: break/continue/pass',
      'Functions',
    ],
  },
  {
    range: 'Days 12–22',
    title: 'Advanced Python & OOP',
    items: [
      'Modules & packages',
      'File handling',
      'Exception handling',
      'Classes & objects',
      'Inheritance & polymorphism',
      'Iterators, generators & decorators',
    ],
  },
  {
    range: 'Days 23–33',
    title: 'Databases & SQL',
    items: [
      'Relational modelling',
      'SQL queries & joins',
      'PostgreSQL in practice',
      'SQLAlchemy ORM',
      'Migrations',
      'Query performance basics',
    ],
  },
  {
    range: 'Days 34–44',
    title: 'FastAPI & Backend',
    items: [
      'REST fundamentals',
      'FastAPI routing & schemas',
      'Authentication & JWT',
      'Role-based access control',
      'Testing APIs',
      'Deployment basics',
    ],
  },
  {
    range: 'Days 45–55',
    title: 'React & Full Stack Projects',
    items: [
      'React components & hooks',
      'Routing & state',
      'Consuming APIs with Axios',
      'Tailwind CSS',
      'Capstone project',
      'Portfolio & interview prep',
    ],
  },
];

const OUTCOMES = [
  { stat: '55', label: 'Days of structured training' },
  { stat: '45 + 45', label: 'Course days plus internship days' },
  { stat: '1:1', label: 'Mentor support throughout' },
  { stat: '100%', label: 'Placement assistance' },
];

function EnquiryForm() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState({ state: 'idle', text: '' });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ state: 'sending', text: '' });
    try {
      const { data } = await api.post('/public/enquiries', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
      setStatus({ state: 'sent', text: data.message });
      setForm({ name: '', phone: '', email: '', message: '' });
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
        <label className="label" htmlFor="en-message">Your message</label>
        <textarea id="en-message" rows={4} className="input" required
                  placeholder="Tell us what you'd like to know — batch dates, fees, eligibility…"
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

export default function Landing() {
  const [open, setOpen] = useState(false);

  // The public page is a light surface; the app shell sets a navy-tinted body.
  useEffect(() => {
    document.title = 'MOP Careers — Python Full Stack Bootcamp';
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
              Python Full Stack Programme
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-5xl">
              Become a job-ready{' '}
              <span className="text-teal-300">Python Full Stack</span> developer in 55 days
            </h1>
            <p className="mt-5 max-w-2xl text-base text-navy-200 sm:text-lg">
              A 45-day intensive course followed by a 45-day hands-on internship. Learn
              Python, SQL, FastAPI and React by building real applications — with mentor
              support, mock interviews and placement assistance throughout.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#enquire" className="btn-cta">Enquire now</a>
              <a href="#curriculum" className="btn inline-flex border border-navy-400 text-white hover:bg-navy-600">
                View curriculum
              </a>
            </div>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-navy-600 pt-8 sm:grid-cols-4">
            {OUTCOMES.map((o) => (
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
              MOP Careers is a focused training institute for people who want to move into
              software development and need a structured, accountable path to get there.
            </p>
            <p className="mt-3 text-navy-500">
              We run one programme and run it properly: Python Full Stack. Small batches,
              a fixed 55-day syllabus, daily class recordings and notes, attendance you can
              actually see, and a mentor who knows your name.
            </p>
            <p className="mt-3 text-navy-500">
              Every student gets a personal dashboard tracking their progress from
              enrolment through to an offer letter.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { t: 'Structured syllabus', d: '55 days mapped out from day one — no improvised lessons.' },
              { t: 'Never miss a class', d: 'Every session recorded, with downloadable notes.' },
              { t: 'Real internship', d: '45 days building production-style software after the course.' },
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

      {/* ------------------------------------------------------- programme */}
      <section id="programme" className="bg-navy-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-navy sm:text-3xl">How the programme works</h2>
          <p className="mt-3 max-w-2xl text-navy-500">
            Ninety days in total, split into two halves that build on each other.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="card border-t-4 border-t-teal p-6 sm:p-8">
              <span className="badge-done">Days 1–45</span>
              <h3 className="mt-3 text-xl font-bold text-navy">The course</h3>
              <p className="mt-2 text-sm text-navy-500">
                Daily live classes covering Python, databases, FastAPI and React. Each day
                has a defined topic, a recording, notes and tracked attendance.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-navy-600">
                {['Live instructor-led sessions',
                  'Recordings and notes for every class',
                  'Attendance and progress tracking',
                  'Doubt support between classes'].map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-teal">&#10003;</span>{i}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card border-t-4 border-t-orange p-6 sm:p-8">
              <span className="badge-warn">Days 46–90</span>
              <h3 className="mt-3 text-xl font-bold text-navy">The internship</h3>
              <p className="mt-2 text-sm text-navy-500">
                A 45-day hands-on internship applying what you learned to real project work,
                running alongside placement preparation.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-navy-600">
                {['Project work with code review',
                  'ATS resume builder and scoring',
                  'AI-assisted mock interviews',
                  'Placement assistance and referrals'].map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-orange">&#10003;</span>{i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ curriculum */}
      <section id="curriculum" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold text-navy sm:text-3xl">55-day curriculum outline</h2>
        <p className="mt-3 max-w-2xl text-navy-500">
          Days 1–11 are fixed across every batch. Later modules are finalised by your
          instructor and may be adjusted to suit the group.
        </p>

        <div className="mt-10 space-y-5">
          {CURRICULUM.map((mod) => (
            <div key={mod.range} className="card p-5 sm:p-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-bold text-navy">{mod.title}</h3>
                <span className={mod.fixed ? 'badge-done self-start' : 'badge-pending self-start'}>
                  {mod.range}
                </span>
              </div>
              <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {mod.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-navy-600">
                    <span className="text-teal">&middot;</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
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
              { stat: '2 weeks', label: 'Average time to first interview' },
            ].map((o) => (
              <div key={o.label} className="card p-6 text-center">
                <p className="text-3xl font-bold text-teal">{o.stat}</p>
                <p className="mt-2 text-sm text-navy-500">{o.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { role: 'Python Full Stack Developer', where: 'Product and services companies' },
              { role: 'Backend Developer', where: 'FastAPI, Django and Flask teams' },
              { role: 'Software Engineer Trainee', where: 'Graduate engineering programmes' },
              { role: 'Associate Engineer', where: 'Application development teams' },
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
              Tell us a bit about yourself and what you&apos;d like to know. Someone from the
              MOP Careers team will get back to you.
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
            <p className="mt-2 text-xs">Python Full Stack Development Programme</p>
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

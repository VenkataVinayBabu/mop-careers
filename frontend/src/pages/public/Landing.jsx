import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { warmUp } from '../../api/client';
import CountUp from '../../components/CountUp';
import { FEATURED_COURSES, LIVE_COURSES, OTHER_COURSES } from '../../data/courses';
import {
  COMPANIES, FAQ, MENTORS, OUTCOMES, PLACEMENTS_TICKER, PROCESS, STATS, STORIES,
} from '../../data/site';
import CourseCard from './CourseCard';
import EnquiryForm from './EnquiryForm';
import {
  PublicFloats, PublicFooter, PublicHeader, WhatsAppIcon, contactHref, useHashScroll,
} from './PublicChrome';

/*
 * Public marketing site — no authentication anywhere on this page. The only
 * network call is the enquiry POST.
 *
 * The accent serif (`.ser`) has four jobs here and no others: the second
 * clause of a section heading, course card index numerals, display statistics,
 * and statistic suffixes. Quotes stay in the sans.
 */

function Eyebrow({ children, center = false }) {
  return (
    <span className={`eyebrow ${center ? 'justify-center' : ''}`}>{children}</span>
  );
}

function Stat({ stat }) {
  return (
    <div>
      <CountUp
        value={stat.value}
        prefix={stat.prefix || ''}
        suffix={stat.suffix || ''}
        decimals={stat.decimals || 0}
        className="block text-[1.85rem] font-extrabold tracking-tight text-navy"
        suffixClassName="text-orange"
      />
      <span className="mt-1 block text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-navy-400">
        {stat.label}
      </span>
    </div>
  );
}

const STEP_ICONS = [
  'M9 2h6v2h3v18H6V4h3V2Zm0 8h6M9 14h6',
  'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
  'M12 3 2 8l10 5 10-5-10-5ZM6 11v5c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-5',
  'M12 3a6 6 0 0 0-3 11v3h6v-3a6 6 0 0 0-3-11ZM10 21h4',
  'M3 5h18v12H3zM8 21h8M12 17v4',
  'M4 5h16v14H4zM8 9h8M8 13h5',
  'M20 6 9 17l-5-5',
];
const STEP_TINTS = [
  'bg-teal-50 text-teal-ink', 'bg-teal-50 text-teal-ink', 'bg-navy-50 text-navy',
  'bg-orange-50 text-orange-ink', 'bg-teal-50 text-teal-ink', 'bg-navy-50 text-navy',
  'bg-orange-50 text-orange-ink',
];

const PILLARS = [
  { t: 'Live mentor-led classes', d: 'Taught live by working engineers, with recordings, notes and doubt support between sessions so a missed class is never a lost one.',
    icon: 'M12 3 2 8l10 5 10-5-10-5ZM6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5', tint: 'bg-teal-50 text-teal-ink' },
  { t: 'AI mock interviews', d: 'Practise as often as you like against real hiring rounds, then sit live mocks with a mentor before the real thing.',
    icon: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v1a7 7 0 0 1-14 0v-1M12 18v4', tint: 'bg-orange-50 text-orange-ink' },
  { t: 'ATS-ready resume', d: 'Build a resume that gets past the screening software, then score it against the actual job description before you apply.',
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M9 13h6M9 17h4', tint: 'bg-navy-50 text-navy' },
  { t: 'Placement support', d: 'A dedicated placement team, referrals into the hiring network, and help negotiating the offer when it lands.',
    icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4 4 2 2 4-4', tint: 'bg-teal-50 text-teal-ink' },
];

export default function Landing() {
  const navigate = useNavigate();
  useHashScroll();

  useEffect(() => {
    document.title = 'MOP Careers — Your Future. Our Priority.';
    // Wake the sleeping API while the visitor reads, so the enquiry form does
    // not have to pay for the cold start when they get to it.
    warmUp();
  }, []);

  const openCourses = () => navigate('/courses');

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />

      {/* ---------------------------------------------------------- hero */}
      <section id="top" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(11,30,70,.055) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(11,30,70,.055) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 62% at 50% 38%, #000 45%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 62% at 50% 38%, #000 45%, transparent 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 44% 46% at 82% 14%, rgba(238,89,5,.12), transparent 62%),' +
              'radial-gradient(ellipse 46% 48% at 12% 76%, rgba(0,152,157,.13), transparent 64%)',
          }}
        />

        <div className="relative mx-auto max-w-[1240px] px-6 py-14 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-navy-100 bg-white px-4 py-1.5 text-[0.8rem] font-semibold text-navy shadow-card">
            <span className="block h-[7px] w-[7px] rounded-full bg-teal" />
            Pay After Placement &middot; MOP Careers
          </span>

          <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold leading-[1.02] tracking-tight text-navy">
            Learn now. <span className="ser text-[1.08em] text-teal">Pay</span> after you&apos;re placed.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[1.06rem] text-navy-500">
            Live, mentor-led career programmes built with the teams who do the hiring — data, AI,
            full stack, cloud and more. You only pay once we&apos;ve helped you land the job.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#enquire" className="pbtn-primary">Book a free 1:1 call &rarr;</a>
            <button type="button" onClick={openCourses} className="pbtn-outline">
              Explore all {LIVE_COURSES.length} courses
            </button>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4">
            {STATS.map((s) => <Stat key={s.label} stat={s} />)}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- ticker */}
      <div className="overflow-hidden border-y border-navy-100 bg-white" aria-label="Recent placements">
        <div className="flex w-max gap-12 py-3.5 motion-safe:animate-[mop-ticker_38s_linear_infinite]">
          {/* Doubled so the loop has no visible seam. */}
          {[...PLACEMENTS_TICKER, ...PLACEMENTS_TICKER].map(([co, ctc], i) => (
            <span key={`${co}-${i}`} className="inline-flex items-center gap-2.5 whitespace-nowrap text-[0.86rem]">
              <span className="block h-1.5 w-1.5 rounded-full bg-teal" />
              <b className="font-bold text-navy">{co}</b>
              <span className="text-navy-400">{ctc}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------- courses */}
      <section id="courses" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-11 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-12">
            <div>
              <Eyebrow>All {LIVE_COURSES.length} courses</Eyebrow>
              <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
                Career launchpads. <span className="ser text-teal">Built for hiring.</span>
              </h2>
            </div>
            <p className="text-[1.02rem] text-navy-500">
              Every course is designed with input from senior engineers and hiring managers.
              Real projects, real referrals.
            </p>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            {FEATURED_COURSES.map((c, i) => (
              <CourseCard key={c.slug} course={c} index={i} featured onOpen={openCourses} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OTHER_COURSES.map((c, i) => (
              <CourseCard
                key={c.slug}
                course={c}
                index={FEATURED_COURSES.length + i}
                onOpen={openCourses}
              />
            ))}
          </div>

          <div className="mt-9 text-center">
            <button type="button" onClick={openCourses} className="pbtn-outline">
              View all {LIVE_COURSES.length} courses &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- process */}
      <section id="process" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-11 text-center">
            <Eyebrow center>Step-by-step overview</Eyebrow>
            <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
              <span className="text-teal-ink">Pay After Placement</span> <span className="ser">Process</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[1.02rem] text-navy-500">
              From application to your first day on the job — here&apos;s exactly how it works.
            </p>
          </div>

          <ol className="grid list-none gap-3.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {PROCESS.map(([title, caption], i) => (
              <li key={title} className="rounded-[18px] border border-navy-100 bg-white p-5 text-center">
                <span className={`relative mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-[14px] ${STEP_TINTS[i]}`}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={STEP_ICONS[i]} />
                  </svg>
                  <b className="absolute -right-1.5 -top-1.5 grid h-[21px] w-[21px] place-items-center rounded-full bg-navy text-[0.67rem] font-bold tabular-nums text-white">
                    {i + 1}
                  </b>
                </span>
                <h3 className="text-[0.88rem] font-bold text-teal-ink">{title}</h3>
                <p className="mt-1 text-[0.75rem] text-navy-400">{caption}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 text-center">
            <a href="#enquire" className="pbtn-primary">Start your application &rarr;</a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ outcomes */}
      <section id="outcomes" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-11">
            <Eyebrow>Placement outcomes</Eyebrow>
            <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
              The numbers we&apos;re <span className="ser text-teal">proud</span> of.
            </h2>
            <p className="mt-4 max-w-2xl text-[1.02rem] text-navy-500">
              Figures are indicative and depend on skills, experience, interview performance
              and employer.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {OUTCOMES.map((o) => (
              <div key={o.label} className="rounded-[20px] border border-navy-100 bg-white p-6">
                <CountUp
                  value={o.value}
                  prefix={o.prefix || ''}
                  suffix={o.suffix || ''}
                  decimals={o.decimals || 0}
                  className="ser block text-[clamp(2.6rem,6vw,4.1rem)] leading-[0.95] text-navy"
                  suffixClassName="text-orange"
                />
                <span className="mt-3 block text-[0.8rem] text-navy-500">{o.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- pillars */}
      <section id="about" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-11">
            <Eyebrow>What&apos;s included</Eyebrow>
            <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
              Everything you need. <span className="ser text-teal">Nothing you don&apos;t.</span>
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.t} className="rounded-[20px] border border-navy-100 bg-paper p-6">
                <span className={`mb-4 grid h-11 w-11 place-items-center rounded-[13px] ${p.tint}`}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d={p.icon} />
                  </svg>
                </span>
                <h3 className="text-[1.05rem] font-bold tracking-tight text-navy">{p.t}</h3>
                {/* Four lines reserved. Copy is written to fill four at desktop
                    width, but line counts move with viewport and font size, so
                    copy length alone will not hold the cards level. */}
                <p className="mt-2 text-[0.87rem] text-navy-500 sm:min-h-[5.22rem]">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- mentors */}
      <section id="mentors" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-11 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-12">
            <div>
              <Eyebrow>Meet your mentors</Eyebrow>
              <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
                Taught by people who&apos;ve <span className="ser text-teal">done the job.</span>
              </h2>
            </div>
            <p className="text-[1.02rem] text-navy-500">
              Every learner is matched with a mentor for the whole programme — not just a
              support queue.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MENTORS.map((m) => (
              <article key={m.name} className="overflow-hidden rounded-[20px] border border-navy-100 bg-white">
                {/* Photo slot — a placeholder until real portraits are supplied. */}
                <div className="grid aspect-square place-items-center bg-gradient-to-br from-navy-50 to-navy-100 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-navy-300">
                  Photo
                </div>
                <div className="p-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-teal-ink">{m.former}</p>
                  <h3 className="mt-1.5 text-base font-bold tracking-tight text-navy">{m.name}</h3>
                  {/* Two lines reserved, so a mentor with a shorter speciality
                      does not leave their card looking half-finished. */}
                  <p className="mt-1.5 text-[0.81rem] text-navy-500 sm:min-h-[2.43rem]">{m.focus}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- stories */}
      <section id="stories" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-11">
            <Eyebrow>Learner stories</Eyebrow>
            <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
              Real careers. <span className="ser text-teal">Real switches.</span> Real numbers.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STORIES.map((s) => (
              <article key={s.name} className="flex flex-col rounded-[20px] border border-navy-100 bg-white p-6">
                <div className="text-[0.82rem] tracking-[0.12em] text-orange" aria-label="Five out of five">
                  &#9733;&#9733;&#9733;&#9733;&#9733;
                </div>
                {/* Quotes stay in the sans — the serif is for headings and figures.
                    Height is RESERVED rather than the copy being padded: these are
                    words attributed to named people, and stretching someone's
                    testimonial to fill a layout is putting words in their mouth.
                    Real quotes will arrive at whatever length they arrive at, so
                    the card has to absorb that. */}
                <blockquote className="mt-3.5 text-[0.9rem] text-navy sm:min-h-[5.4rem]">
                  &ldquo;{s.quote}&rdquo;
                </blockquote>
                <div className="mt-auto flex items-center gap-3 pt-6">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-100 text-[0.78rem] font-bold text-navy-500">
                    {s.initials}
                  </span>
                  <span>
                    <b className="block text-[0.85rem] font-bold text-navy">{s.name}</b>
                    <small className="text-[0.73rem] text-navy-400">{s.role}</small>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- companies */}
      <section id="companies" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-11">
            <Eyebrow>Hiring network</Eyebrow>
            <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
              Where we make <span className="ser text-teal">introductions.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-navy-100 bg-navy-100 sm:grid-cols-4 lg:grid-cols-6">
            {COMPANIES.map((c) => (
              <div key={c} className="bg-white px-2 py-6 text-center text-[0.87rem] font-bold tracking-tight text-navy-300">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- faq */}
      <section id="faq" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-11">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
              Answers to the <span className="ser text-teal">questions</span> you&apos;re about to ask.
            </h2>
          </div>

          <div className="mx-auto max-w-3xl">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0} className="group border-b border-navy-100">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[0.98rem] font-semibold text-navy [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="shrink-0 text-xl font-light leading-none text-teal">
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">&times;</span>
                  </span>
                </summary>
                <p className="pb-6 text-[0.91rem] text-navy-500">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- enquire */}
      <section id="enquire" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <Eyebrow>Get in touch</Eyebrow>
              <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
                Talk to a counsellor — <span className="ser text-teal">free, no commitment.</span>
              </h2>
              <p className="mt-5 max-w-xl text-[1.02rem] text-navy-500">
                Tell us where you are now and what you want to do next. We&apos;ll tell you
                honestly which track fits — including if the answer is none of them yet.
              </p>

              <ul className="mt-7 grid gap-3">
                {['No prior programming experience needed',
                  'Tracks for freshers and working professionals',
                  'Ask about eligibility, fees or the internship'].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[0.92rem] text-navy-500">
                    <svg className="mt-1 h-4 w-4 shrink-0 text-teal" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m20 6-11 11-5-5" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href={contactHref()} className="pbtn-wa">
                  <WhatsAppIcon className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            <EnquiryForm />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- final CTA */}
      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="relative overflow-hidden rounded-[28px] bg-navy-900 px-6 py-14 text-center text-white sm:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 52% 78% at 88% 20%, rgba(238,89,5,.30), transparent 62%),' +
                  'radial-gradient(ellipse 44% 66% at 8% 92%, rgba(0,152,157,.24), transparent 64%)',
              }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-3xl text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight">
                Ready to <span className="ser text-[1.06em] text-orange-300">learn now</span> and pay later?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-navy-200">
                Book a free 1:1 call and we&apos;ll help you pick the course that fits your
                goals, background and timeline.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href="#enquire" className="pbtn-white">Book a free 1:1 call &rarr;</a>
                <button type="button" onClick={openCourses} className="pbtn-clear">
                  Explore courses
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
      <PublicFloats />
    </div>
  );
}

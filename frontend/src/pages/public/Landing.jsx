import { useCallback, useEffect, useRef, useState } from 'react';

import { warmUp } from '../../api/client';
import Avatar from '../../components/Avatar';
import CountUp from '../../components/CountUp';
import { FEATURED_PROGRAMS, LIVE_PROGRAMS, OTHER_PROGRAMS } from '../../data/programs';
import {
  COMPANIES, FAQ, MENTORS, OUTCOMES, PAP_EXPLAINER, PAP_FEATURES, PAP_STEPS,
  PLACEMENTS_TICKER, REFERRAL, STATS, STORIES,
} from '../../data/site';
import { useSite } from '../../data/siteSettings';
import ProgramCard from './ProgramCard';
import EnquiryForm from './EnquiryForm';
import {
  PublicFloats, PublicFooter, PublicHeader, WhatsAppIcon, contactHref, useHashScroll,
} from './PublicChrome';

/*
 * Public marketing site — no authentication anywhere on this page. The only
 * network call is the enquiry POST.
 *
 * The accent serif (`.ser`) has four jobs here and no others: the second
 * clause of a section heading, program card index numerals, display statistics,
 * and statistic suffixes. Quotes stay in the sans.
 */

/* `tone="light"` for the navy cards — the default orange-ink fails against
   navy, so the rule and the text both lift to teal-300 there. */
function Eyebrow({ children, center = false, tone = 'dark' }) {
  const light = tone === 'light' ? '!text-teal-300 before:!bg-teal-300' : '';
  return (
    <span className={`eyebrow ${center ? 'justify-center' : ''} ${light}`}>{children}</span>
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

/*
 * Arrow controls for a horizontal card rail.
 *
 * Declared at module level, not inside Landing's render body. A component
 * defined in a render body gets a new identity on every state change, which
 * makes React tear the subtree down and rebuild it — the same mistake that
 * once made the nav dropdown close the instant hovering opened it.
 *
 * The arrows are an addition, never the only way through: the rail is a real
 * scroll container, so touch swipe, trackpad and keyboard arrows all work
 * without them. They exist for a mouse user on a desktop, who otherwise has
 * no affordance at all once the scrollbar is hidden.
 */
function RailArrows({ railRef, label }) {
  const [at, setAt] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAt({
      start: el.scrollLeft <= 1,
      // 1px of slack: fractional layout widths mean scrollLeft rarely lands
      // exactly on the maximum, which would leave "next" enabled at the end.
      end: el.scrollLeft >= max - 1,
    });
  }, [railRef]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure, railRef]);

  /* Scroll by a whole viewport of cards rather than a fixed pixel count, so
     the step matches however many happen to be visible. */
  const nudge = (dir) => () => {
    const el = railRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const btn =
    'grid h-10 w-10 place-items-center rounded-full border border-navy-100 bg-white text-navy ' +
    'transition hover:border-teal hover:text-teal-ink disabled:cursor-not-allowed disabled:opacity-35 ' +
    'disabled:hover:border-navy-100 disabled:hover:text-navy';

  return (
    <div className="flex gap-2">
      <button type="button" onClick={nudge(-1)} disabled={at.start} className={btn} aria-label={`Previous ${label}`}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button type="button" onClick={nudge(1)} disabled={at.end} className={btn} aria-label={`Next ${label}`}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

export default function Landing() {
  useHashScroll();
  const mentorRail = useRef(null);
  /* Subscribed so the WhatsApp CTA below re-renders once the live settings
     arrive — `contactHref()` reads the store rather than taking a prop. */
  useSite();

  useEffect(() => {
    document.title = 'MOP Careers — Your Future. Our Priority.';
    // Wake the sleeping API while the visitor reads, so the enquiry form does
    // not have to pay for the cold start when they get to it.
    warmUp();
  }, []);

  /* All eight programmes are on this page, so these scroll rather than
     navigate — there is no separate programmes page any more. */
  const openPrograms = () =>
    document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' });

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
            <button type="button" onClick={openPrograms} className="pbtn-outline">
              Explore all {LIVE_PROGRAMS.length} programs
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

      {/* ------------------------------------------------------- programs */}
      <section id="programs" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-11 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-12">
            <div>
              <Eyebrow>All {LIVE_PROGRAMS.length} programs</Eyebrow>
              <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
                Career launchpads. <span className="ser text-teal">Built for hiring.</span>
              </h2>
            </div>
            <p className="text-[1.02rem] text-navy-500">
              Every program is designed with input from senior engineers and hiring managers.
              Real projects, real referrals.
            </p>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            {FEATURED_PROGRAMS.map((c, i) => (
              <ProgramCard key={c.slug} program={c} index={i} featured href={`/programs/${c.slug}`} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OTHER_PROGRAMS.map((c, i) => (
              <ProgramCard
                key={c.slug}
                program={c}
                index={FEATURED_PROGRAMS.length + i}
                href={`/programs/${c.slug}`}
              />
            ))}
          </div>

        </div>
      </section>

      {/* ----------------------------------------------- pay after placement */}
      {/* Replaced a seven-step "process" strip that told the same story. Two
          numbered walkthroughs on one page read as padding, and this version
          keeps the step that matters commercially: you pay at the end. */}
      <section id="process" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="relative overflow-hidden rounded-[28px] bg-navy-900 px-6 py-12 text-white sm:px-12 sm:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 46% 62% at 92% 8%, rgba(0,152,157,.26), transparent 62%),' +
                  'radial-gradient(ellipse 40% 60% at 4% 96%, rgba(238,89,5,.16), transparent 64%)',
              }}
            />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
              <div>
                <Eyebrow tone="light">The MOP Careers PAP model</Eyebrow>
                <h2 className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight">
                  What is Pay After Placement, <span className="ser text-teal-300">really?</span>
                </h2>
                <p className="mt-5 max-w-xl text-navy-200">{PAP_EXPLAINER}</p>

                <ul className="mt-6 flex flex-wrap gap-2">
                  {PAP_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="rounded-full border border-white/20 px-3 py-1.5 text-[0.76rem] font-medium text-navy-200"
                    >
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#enquire" className="pbtn-primary">Book a free 1:1 call &rarr;</a>
                  <button type="button" onClick={openPrograms} className="pbtn-clear">
                    Compare programs
                  </button>
                </div>
              </div>

              <ol className="grid list-none gap-4 sm:grid-cols-2">
                {PAP_STEPS.map(([title, caption], i) => (
                  <li
                    key={title}
                    className="rounded-[20px] border border-white/10 bg-white/[0.04] p-6"
                  >
                    <span className="block text-[1.6rem] font-extrabold leading-none tracking-tight text-teal-300 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-3 text-[1rem] font-bold tracking-tight text-white">{title}</h3>
                    <p className="mt-1.5 text-[0.84rem] text-navy-200 sm:min-h-[4.2rem]">{caption}</p>
                  </li>
                ))}
              </ol>
            </div>
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
              <h2
                id="mentors-heading"
                className="mt-3.5 text-[clamp(1.85rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-navy"
              >
                Taught by people who&apos;ve <span className="ser text-teal">done the job.</span>
              </h2>
            </div>
            <div className="flex items-end justify-between gap-6">
              <p className="text-[1.02rem] text-navy-500">
                Every learner is matched with a mentor for the whole programme — not just a
                support queue.
              </p>
              {/* Hidden below lg, where the rail is swiped rather than clicked
                  and a pair of buttons is just clutter beside a thumb. */}
              <div className="hidden shrink-0 lg:block">
                <RailArrows railRef={mentorRail} label="mentors" />
              </div>
            </div>
          </div>

          {/*
            * A rail rather than a grid. Thirteen mentors in a four-up grid is
            * four rows of near-identical cards — the section became the tallest
            * thing on the page while saying the least, and the fold landed in
            * the middle of it. Scrolling keeps the whole section to one card
            * high however many mentors there are, which matters because that
            * number is about to become editable.
            *
            * tabIndex + role make it reachable by keyboard: a hidden scrollbar
            * with no focusable child would otherwise strand anyone not using a
            * mouse. The heading names it via aria-labelledby.
            */}
          <div
            ref={mentorRail}
            tabIndex={0}
            role="region"
            aria-labelledby="mentors-heading"
            className="rail rail-bleed pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-4"
          >
            {MENTORS.map((m, i) => (
              <article
                key={m.name}
                className="w-[220px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-navy-100 bg-white sm:w-[252px]"
              >
                {/* Real portrait when one exists, otherwise a monogram. Never
                    a stock photo of someone else — these are real people. */}
                <Avatar
                  name={m.name}
                  photo={m.photo}
                  index={i}
                  className="aspect-square w-full"
                  textClassName="text-[2.4rem]"
                />
                <div className="p-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-teal-ink">{m.former}</p>
                  <h3 className="mt-1.5 text-base font-bold tracking-tight text-navy">{m.name}</h3>
                  {/* Three lines reserved here, not two: the cards are narrower
                      in a rail than in the old grid, so the same speciality
                      wraps one line further. */}
                  <p className="mt-1.5 text-[0.81rem] text-navy-500 sm:min-h-[3.64rem]">{m.focus}</p>
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
            {STORIES.map((s, i) => (
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
                  <Avatar
                    name={s.name}
                    photo={s.photo}
                    index={i}
                    className="h-10 w-10 shrink-0 rounded-full"
                  />
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

      {/* ------------------------------------------ refer & earn + final CTA */}
      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className={`grid gap-5 ${REFERRAL.enabled ? 'lg:grid-cols-2' : ''}`}>
            {REFERRAL.enabled && (
              <div className="flex flex-col rounded-[28px] border border-navy-100 bg-white px-7 py-10 sm:px-9">
                <Eyebrow>Refer &amp; earn</Eyebrow>
                <h2 className="mt-3.5 text-[clamp(1.6rem,3.2vw,2.3rem)] font-extrabold leading-[1.06] tracking-tight text-navy">
                  Earn <span className="ser text-teal">{REFERRAL.amount}</span> {REFERRAL.headline}
                </h2>
                <p className="mt-4 max-w-md text-[0.98rem] text-navy-500">{REFERRAL.body}</p>
                <div className="mt-auto pt-8">
                  <a href="#enquire" className="pbtn-outline">{REFERRAL.cta} &rarr;</a>
                </div>
              </div>
            )}

            <div className="relative overflow-hidden rounded-[28px] bg-navy-900 px-7 py-10 text-white sm:px-9">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 52% 78% at 88% 20%, rgba(238,89,5,.30), transparent 62%),' +
                    'radial-gradient(ellipse 44% 66% at 8% 92%, rgba(0,152,157,.24), transparent 64%)',
                }}
              />
              <div className="relative flex h-full flex-col">
                <Eyebrow tone="light">Kickstart your career</Eyebrow>
                <h2 className="mt-3.5 text-[clamp(1.6rem,3.2vw,2.3rem)] font-extrabold leading-[1.06] tracking-tight">
                  Ready to <span className="ser text-orange-300">learn now</span> and pay after
                  you&apos;re placed?
                </h2>
                <p className="mt-4 max-w-md text-[0.98rem] text-navy-200">
                  Book a free 1:1 call and we&apos;ll help you pick the program that fits your
                  goals, background and timeline.
                </p>
                <div className="mt-auto flex flex-wrap gap-3 pt-8">
                  <a href="#enquire" className="pbtn-white">Book a free 1:1 call &rarr;</a>
                  <button type="button" onClick={openPrograms} className="pbtn-clear">
                    Explore programs
                  </button>
                </div>
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

import { useEffect, useState } from 'react';

import { PublicFloats, PublicFooter, PublicHeader, useHashScroll } from './PublicChrome';
import { api } from '../../api/client';

/*
 * About Us, carried across from mopcareers.in/about.php word for word.
 *
 * The copy is hardcoded, unlike programmes and mentors: this is MOP's own
 * story rather than a catalogue, and it changes about as often as the company
 * does. The one exception is the statistics strip, which reads the same rows
 * the landing page does — hardcoding those four figures would mean the
 * headline numbers disagreeing with themselves the first time Bala edited them
 * at Admin > Website > Statistics.
 *
 * The two leaders are also deliberately here rather than in the `mentors`
 * table: mentors teach programmes and are shown as such, and folding the CEO
 * into that list would put him on the mentors carousel.
 */

const VALUES = [
  {
    title: 'Practical Learning',
    body: 'Every program is built around real-world projects, live mentor-led classes, and hands-on tools — not just theory.',
  },
  {
    title: 'Integrity',
    body: 'We operate with complete transparency. Our Pay After Placement model is built on trust — you pay only after you succeed.',
  },
  {
    title: 'Student-Centric',
    body: "Every decision we make is guided by what's best for your growth. 1:1 doubt support, career mentorship, and placement assistance — all for you.",
  },
  {
    title: 'Innovation',
    body: 'We continuously evolve our curriculum and teaching methods to stay ahead of industry trends, AI tools, and hiring demands.',
  },
  {
    title: 'Career Commitment',
    body: 'From ATS resumes and LinkedIn optimisation to AI mock interviews and job referrals — we support your career journey end-to-end.',
  },
  {
    title: 'Inclusivity',
    body: 'We believe in equal opportunity. Our doors are open to talent from all backgrounds, degrees, and locations.',
  },
];

/* The leadership list comes from the API — Bala adds a COO, a lead developer
   or anyone else at Admin > Website > Leadership rather than asking for a
   deploy. Bios keep their blank lines; each becomes its own paragraph. */

/* MOP's own six on about.php. Note this list is NOT the eight-programme
   catalogue the rest of this site publishes — it is the summary they wrote for
   this page, so it is reproduced as written rather than generated. */
const OFFERINGS = [
  { title: 'Full Stack Development', meta: 'MERN Stack · DSA · System Design · 6–9 Months' },
  { title: 'Data Science with AI/ML', meta: 'Python · SQL · ML · Power BI · 6–9 Months' },
  { title: 'Digital Marketing with AI', meta: 'SEO · SEM · Meta Ads · Analytics · 4–6 Months' },
  { title: 'Data Analytics with AI', meta: 'Excel · SQL · Python · Tableau · 4–6 Months' },
  { title: 'GenAI for Professionals', meta: 'LLMs · Prompt Engineering · AI Agents · 2–3 Months' },
  { title: 'GenAI for Developers × IBM', meta: 'RAG · AI Agents · Deployment · 4 Months' },
];

const ABOUT_STATS = [
  { value: '1,050+', label: 'Total Placements' },
  { value: '500+', label: 'Placement Partners' },
  { value: '47.6 LPA', label: 'Highest CTC' },
  { value: '87%', label: 'Placement Success Rate' },
];

function Eyebrow({ children }) {
  return (
    <span className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-teal-ink">
      {children}
    </span>
  );
}

/** One person's card. Shared by both sections — leadership and team differ in
 *  who is in them and what the heading says, not in how a person is shown. */
function PersonCard({ person }) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-7">
      <div className="flex items-start gap-4">
        {person.photo_url && (
          <img
            src={person.photo_url}
            alt={person.name}
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-navy">{person.name}</h3>
          {person.role && <p className="mt-1 text-sm font-medium text-teal-ink">{person.role}</p>}
        </div>
      </div>

      {(person.tags.length > 0 || person.meta) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {person.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-navy-50 px-2.5 py-1 text-[0.72rem] font-semibold text-navy-500"
            >
              {t}
            </span>
          ))}
          {person.meta && (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[0.72rem] font-semibold text-teal-ink">
              {person.meta}
            </span>
          )}
        </div>
      )}

      {/* Blank lines in the textarea become paragraphs here. */}
      {person.bio
        .split(/\n\s*\n/)
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => (
          <p key={text.slice(0, 40)} className="mt-4 text-[0.9rem] text-navy-500">
            {text}
          </p>
        ))}
    </div>
  );
}

export default function About() {
  useHashScroll();
  const [people, setPeople] = useState([]);
  const leadership = people.filter((p) => p.section === 'leadership');
  const team = people.filter((p) => p.section === 'team');

  useEffect(() => {
    document.title = 'About Us — MOP Careers';
    let cancelled = false;
    api
      .get('/public/leaders')
      .then(({ data }) => !cancelled && setPeople(data))
      /* The rest of the page — mission, values, programmes — is worth reading
         without it, so a failure drops the section rather than the page. */
      .catch(() => !cancelled && setPeople([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-paper">
      <PublicHeader />

      <main>
        {/* Our story */}
        <section className="bg-navy-900 py-20 text-center sm:py-24">
          <div className="mx-auto max-w-[820px] px-6">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-teal-300">
              Our Story
            </span>
            <h1 className="mt-5 text-3xl font-bold text-white sm:text-5xl">
              Learn. Build. Get Job-Ready.
            </h1>
            <p className="mx-auto mt-5 max-w-[680px] text-navy-200">
              MOP Careers is dedicated to bridging the gap between education and employment
              through industry-relevant Pay After Placement programs, expert mentorship, and
              guaranteed placement support.
            </p>
          </div>
        </section>

        {/* Mission and vision */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto grid max-w-[1240px] gap-6 px-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-navy-100 bg-white p-7">
              <h2 className="text-xl font-bold text-navy">Our Mission</h2>
              <p className="mt-4 text-navy-500">
                To empower aspiring professionals with industry-relevant skills, practical
                project experience, and dedicated placement assistance — without the barrier of
                upfront fees.
              </p>
              <p className="mt-4 text-navy-500">
                We believe everyone — fresher, graduate, or career switcher — deserves a real
                shot at a great career. Our Pay After Placement model ensures you only pay after
                you succeed.
              </p>
            </div>
            <div className="rounded-2xl border border-navy-100 bg-white p-7">
              <h2 className="text-xl font-bold text-navy">Our Vision</h2>
              <p className="mt-4 text-navy-500">
                To create accessible, practical, and career-focused learning programs that help
                freshers, graduates, and career switchers become job-ready — and to become
                India&apos;s most trusted Pay After Placement platform.
              </p>
              <p className="mt-4 text-navy-500">
                We envision an education ecosystem where learners don&apos;t simply complete a
                course — they develop practical skills, gain project experience, prepare for
                interviews, and become career-ready.
              </p>
            </div>
          </div>
        </section>

        {/* Core values */}
        <section className="bg-navy-50 py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">
              Our Core Values
            </h2>
            <p className="mt-3 text-center text-navy-400">
              The principles that guide everything we do
            </p>
            <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {VALUES.map((v) => (
                <div key={v.title} className="rounded-2xl border border-navy-100 bg-white p-6">
                  <h3 className="font-semibold text-navy">{v.title}</h3>
                  <p className="mt-2 text-[0.9rem] text-navy-400">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Leadership. Dropped entirely when nobody is listed — a heading and
            a quote over an empty space reads as broken. */}
        {leadership.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <div className="text-center">
              <Eyebrow>Leadership &amp; Industry Experience</Eyebrow>
              <h2 className="mt-4 text-2xl font-bold text-navy sm:text-3xl">Our Leadership</h2>
              <p className="mx-auto mt-4 max-w-[640px] text-navy-500">
                &ldquo;Learn Practical Skills. Build Real Experience. Create Career
                Opportunities.&rdquo;
              </p>
            </div>

            <div className="mt-11 grid gap-6 lg:grid-cols-2">
              {leadership.map((p) => <PersonCard key={p.id} person={p} />)}
            </div>
          </div>
        </section>
        )}

        {/* Our Team — the people who build and run MOP rather than lead it.
            Its own section rather than more cards under "Our Leadership",
            which would have claimed something untrue about who they are. */}
        {team.length > 0 && (
        <section className="bg-navy-50 py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <div className="text-center">
              <Eyebrow>The People Behind MOP</Eyebrow>
              <h2 className="mt-4 text-2xl font-bold text-navy sm:text-3xl">Our Team</h2>
              <p className="mx-auto mt-4 max-w-[640px] text-navy-500">
                The people who build and run the platform behind the programmes.
              </p>
            </div>

            <div className="mt-11 grid gap-6 lg:grid-cols-2">
              {team.map((p) => <PersonCard key={p.id} person={p} />)}
            </div>
          </div>
        </section>
        )}

        {/* about.php's own four, reproduced exactly as asked.

            They are NOT the same four the landing page shows: the statistics
            table currently holds 1050+, 150+, ₹47.6L and 500+ under different
            labels, and rendering those here would have quietly published
            different numbers from the page being copied. Worth reconciling —
            the two pages now claim different things in different places, and
            the figures on this one cannot be edited at Admin > Website. */}
        <section className="bg-navy-900 py-14">
          <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-6 px-6 text-center lg:grid-cols-4">
            {ABOUT_STATS.map((s) => (
              <div key={s.label}>
                <p className="ser text-[clamp(2rem,5vw,3rem)] leading-none text-white">
                  {s.value}
                </p>
                <p className="mt-2 text-[0.8rem] text-navy-300">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What we offer */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <div className="text-center">
              <Eyebrow>What We Offer</Eyebrow>
              <h2 className="mt-4 text-2xl font-bold text-navy sm:text-3xl">
                Programs at MOP Careers
              </h2>
              <p className="mx-auto mt-3 max-w-[620px] text-navy-400">
                Industry-driven programs combining live training, real projects, and dedicated
                placement support
              </p>
            </div>

            <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {OFFERINGS.map((o) => (
                <div key={o.title} className="rounded-2xl border border-navy-100 bg-white p-6">
                  <h3 className="font-semibold text-navy">{o.title}</h3>
                  <p className="mt-2 text-[0.85rem] text-navy-400">{o.meta}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="bg-navy-50 py-16 text-center sm:py-20">
          <div className="mx-auto max-w-[720px] px-6">
            <h2 className="text-2xl font-bold text-navy sm:text-3xl">
              Be Part of Our Success Story
            </h2>
            <p className="mt-3 text-navy-500">
              Join 1,050+ students who have transformed their careers with MOP Careers&apos; Pay
              After Placement programs.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="/#programs" className="pbtn-primary">Explore Programs</a>
              <a href="/#enquire" className="pbtn-outline">Book FREE 1:1 Call</a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
      <PublicFloats />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { warmUp } from '../../api/client';
import Avatar from '../../components/Avatar';
import { LIVE_PROGRAMS, programBySlug } from '../../data/programs';
import {
  CAREER_SERVICES, COMPANIES, DEFAULT_FEES, PROGRAM_FAQ, ROADMAP, mentorsFor,
} from '../../data/site';
import EnquiryForm from './EnquiryForm';
import ProgramCard from './ProgramCard';
import { PublicFloats, PublicFooter, PublicHeader } from './PublicChrome';

/*
 * One program's own page, at /programs/{slug}.
 *
 * ONE TEMPLATE, EIGHT PAGES. Everything comes from the program's `detail`
 * block, and every section is optional — if a program has no syllabus yet,
 * that section is simply absent rather than rendering an empty shell. The
 * global sections below (how it works, career services, hiring partners, FAQ)
 * appear on every program page, so even a program with nothing but a name and
 * a summary still gets a complete, respectable page.
 *
 * That matters because the content arrives program by program. Only Data
 * Science with AI is fully written today.
 */

function Eyebrow({ children, tone = 'dark' }) {
  const light = tone === 'light' ? '!text-teal-300 before:!bg-teal-300' : '';
  return <span className={`eyebrow ${light}`}>{children}</span>;
}

function SectionHead({ eyebrow, title, accent, lede, className = '' }) {
  return (
    <div className={`mb-11 ${className}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3.5 text-[clamp(1.75rem,3.6vw,2.6rem)] font-extrabold leading-[1.06] tracking-tight text-navy">
        {title} {accent && <span className="ser text-teal">{accent}</span>}
      </h2>
      {lede && <p className="mt-4 max-w-2xl text-[1.02rem] text-navy-500">{lede}</p>}
    </div>
  );
}

export default function ProgramDetail() {
  const { slug } = useParams();
  const program = programBySlug(slug);

  /*
   * One phase open at a time. The four titles are the outline of the whole
   * program; with everything expanded that outline disappears into several
   * screens of detail, which is the opposite of what someone skimming wants.
   * -1 means all closed.
   */
  const [openPhase, setOpenPhase] = useState(0);

  /*
   * Collapsing a phase ABOVE the one you just clicked pulls everything below
   * it upwards, so the header you aimed at jumps out from under the cursor.
   * Measure where it was, let React repaint, then put it back.
   */
  const togglePhase = (i) => (e) => {
    e.preventDefault(); // `open` is driven by state, not the native toggle
    const summary = e.currentTarget;
    const before = summary.getBoundingClientRect().top;
    setOpenPhase((current) => (current === i ? -1 : i));
    requestAnimationFrame(() => {
      const after = summary.getBoundingClientRect().top;
      if (after !== before) window.scrollBy(0, after - before);
    });
  };

  useEffect(() => {
    if (program) document.title = `${program.name} — MOP Careers`;
    warmUp();
  }, [program]);

  // An unknown or unpublished slug goes home rather than to a 404 — the
  // programme may simply have been withdrawn, and the list is what they want.
  if (!program) return <Navigate to={{ pathname: '/', hash: '#programs' }} replace />;

  const d = program.detail || {};
  const fees = d.fees || DEFAULT_FEES;
  const mentors = mentorsFor(program.slug);
  const related = LIVE_PROGRAMS.filter((p) => p.slug !== program.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 44% 46% at 84% 10%, rgba(238,89,5,.10), transparent 62%),' +
              'radial-gradient(ellipse 46% 48% at 8% 82%, rgba(0,152,157,.12), transparent 64%)',
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6 py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-6 text-[0.82rem] text-navy-400">
            <a href="/#programs" className="transition hover:text-teal-ink">Programs</a>
            <span className="px-2">/</span>
            <span className="text-navy">{program.name}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            <div>
              <Eyebrow>Pay after placement &middot; {program.name}</Eyebrow>
              <h1 className="mt-4 text-[clamp(2rem,4.6vw,3.4rem)] font-extrabold leading-[1.04] tracking-tight text-navy">
                {d.headline || program.name}
              </h1>
              <p className="mt-5 max-w-2xl text-[1.06rem] text-navy-500">
                {d.intro || program.summary}
              </p>

              {d.highlights?.length > 0 && (
                <ul className="mt-7 grid gap-3">
                  {d.highlights.map((h) => (
                    <li key={h} className="flex gap-2.5 text-[0.95rem] text-navy-600">
                      <svg className="mt-1 h-4 w-4 shrink-0 text-teal" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m20 6-11 11-5-5" />
                      </svg>
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-5">
                <div>
                  <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-navy-400">Duration</dt>
                  <dd className="mt-1 text-[1.3rem] font-extrabold tracking-tight text-navy">{program.duration}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-navy-400">Average CTC</dt>
                  <dd className="mt-1 text-[1.3rem] font-extrabold tracking-tight text-navy">
                    {program.ctcAvg.replace(' avg', '')}
                  </dd>
                </div>
                {program.ctcHigh && (
                  <div>
                    <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-navy-400">Highest</dt>
                    <dd className="mt-1 text-[1.3rem] font-extrabold tracking-tight text-navy">
                      {program.ctcHigh.replace(' highest', '')}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#enquire" className="pbtn-primary">Book a free 1:1 call &rarr;</a>
                {d.syllabus?.length > 0 && (
                  <a href="#syllabus" className="pbtn-outline">See the full syllabus</a>
                )}
              </div>
            </div>

            {/* fee card */}
            <aside className="rounded-[24px] border border-navy-100 bg-white p-7 shadow-pop">
              <Eyebrow>Pay after placement</Eyebrow>
              <h2 className="mt-3 text-[1.3rem] font-extrabold tracking-tight text-navy">{program.name}</h2>

              <div className="mt-5 flex items-baseline gap-3">
                <span className="text-[2.1rem] font-extrabold tracking-tight text-navy">{fees.registration}</span>
                {fees.registrationWas && (
                  <span className="text-[1.05rem] text-navy-300 line-through">{fees.registrationWas}</span>
                )}
              </div>
              <p className="mt-1 text-[0.82rem] text-navy-400">{fees.registrationNote}</p>

              <ul className="mt-6 grid gap-2.5 border-t border-navy-100 pt-6">
                {(d.highlights || [program.summary]).concat([
                  'Unlimited AI mock interviews',
                  'ATS resume and LinkedIn support',
                  'Referrals into the hiring network',
                ]).slice(0, 6).map((f) => (
                  <li key={f} className="flex gap-2.5 text-[0.87rem] text-navy-600">
                    <svg className="mt-1 h-3.5 w-3.5 shrink-0 text-teal" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m20 6-11 11-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <a href="#enquire" className="pbtn-primary mt-6 w-full">Apply now &rarr;</a>
              <p className="mt-3 text-center text-[0.78rem] text-navy-400">
                Then {fees.tuition} once you are placed.
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- why */}
      {d.why?.length > 0 && (
        <section id="why" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <SectionHead
              eyebrow="Why this program"
              title="What makes it"
              accent="worth your time."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {d.why.map((w) => (
                <div key={w.title} className="rounded-[20px] border border-navy-100 bg-paper p-6">
                  <h3 className="text-[1.02rem] font-bold tracking-tight text-navy">{w.title}</h3>
                  <p className="mt-2 text-[0.88rem] text-navy-500 sm:min-h-[4.4rem]">{w.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- roadmap */}
      <section id="roadmap" className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-6">
          <SectionHead
            eyebrow="Three steps"
            title="Learn. Prove."
            accent="Get hired."
            lede="The same route for every program — and you only pay at the end of it."
          />
          <ol className="grid list-none gap-4 lg:grid-cols-3">
            {ROADMAP.map((step, i) => (
              <li key={step.title} className="rounded-[20px] border border-navy-100 bg-white p-6">
                <span className="ser block text-[2rem] leading-none text-navy-200">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-[1.05rem] font-bold tracking-tight text-navy">{step.title}</h3>
                <p className="mt-2 text-[0.88rem] text-navy-500">{step.body}</p>
                <ul className="mt-4 grid gap-1.5 border-t border-navy-100 pt-4">
                  {step.points.map((pt) => (
                    <li key={pt} className="flex gap-2 text-[0.83rem] text-navy-500">
                      <span className="text-teal">&rarr;</span>{pt}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------------- roles */}
      {d.roles?.length > 0 && (
        <section id="roles" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <SectionHead
              eyebrow="Career outcomes"
              title="Roles you will be"
              accent="ready for."
              lede="Salary ranges are indicative and depend on your background, interview performance and employer."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {d.roles.map((r) => (
                <article key={r.title} className="rounded-[20px] border border-navy-100 bg-paper p-6">
                  <h3 className="text-[1.1rem] font-bold tracking-tight text-navy">{r.title}</h3>
                  <p className="mt-2 text-[0.89rem] text-navy-500 sm:min-h-[3.2rem]">{r.body}</p>
                  <div className="mt-5 border-t border-navy-100 pt-4">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-navy-400">
                      Typical starting range
                    </p>
                    <p className="mt-1 text-[1.15rem] font-extrabold tracking-tight text-teal-ink">{r.salary}</p>
                  </div>
                  {r.companies?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {r.companies.map((c) => (
                        <span key={c} className="rounded-full bg-navy/[0.04] px-2.5 py-1 text-[0.72rem] text-navy-500">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ syllabus */}
      {d.syllabus?.length > 0 && (
        <section id="syllabus" className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <SectionHead
              eyebrow="Program architecture"
              title="The full"
              accent="syllabus."
              lede="Each phase ends at a point where you are genuinely employable — and the calibre of employer rises as you go."
            />
            <div className="grid gap-3">
              {d.syllabus.map((phase, i) => (
                <details
                  key={phase.title}
                  open={openPhase === i}
                  className="group rounded-[20px] border border-navy-100 bg-white px-6"
                >
                  <summary
                    onClick={togglePhase(i)}
                    className="flex cursor-pointer list-none items-center gap-4 py-5 [&::-webkit-details-marker]:hidden"
                  >
                    <span className="ser shrink-0 text-[1.6rem] leading-none text-navy-200">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-teal-ink">
                        Phase {i + 1}
                      </span>
                      <span className="mt-0.5 block text-[1.02rem] font-bold tracking-tight text-navy">
                        {phase.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-xl font-light leading-none text-teal">
                      <span className="group-open:hidden">+</span>
                      <span className="hidden group-open:inline">&times;</span>
                    </span>
                  </summary>

                  <div className="pb-6 pl-0 sm:pl-12">
                    <p className="max-w-3xl text-[0.92rem] text-navy-500">{phase.body}</p>
                    {phase.topics?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {phase.topics.map((tp) => (
                          <span key={tp} className="rounded-full bg-navy/[0.04] px-2.5 py-1 text-[0.74rem] text-navy-500">
                            {tp}
                          </span>
                        ))}
                      </div>
                    )}
                    {phase.exit?.length > 0 && (
                      /* The Placements Exit: who you are ready for at the end
                         of this phase, not only at the end of the program. */
                      <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-teal-ink">
                          Placements exit {i + 1}
                        </p>
                        <p className="mt-1 text-[0.86rem] text-navy-600">{phase.exit.join(' · ')}</p>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------- technologies */}
      {d.technologies?.length > 0 && (
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <SectionHead
              eyebrow="Hands-on"
              title="Technologies you will"
              accent="actually use."
            />
            <div className="flex flex-wrap gap-2">
              {d.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-navy-100 bg-paper px-3.5 py-1.5 text-[0.85rem] font-medium text-navy-600"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ projects */}
      {d.projects?.length > 0 && (
        <section id="projects" className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <SectionHead
              eyebrow="Guided projects"
              title="What you will"
              accent="have built."
              lede="Every project is reviewed. This is the portfolio you take into interviews."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {d.projects.map((pr, i) => (
                <article key={pr.title} className="rounded-[20px] border border-navy-100 bg-white p-6">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-orange-ink">
                    Project {i + 1}
                  </p>
                  <h3 className="mt-2 text-[1.08rem] font-bold tracking-tight text-navy">{pr.title}</h3>
                  <p className="mt-2 text-[0.89rem] text-navy-500 sm:min-h-[3.2rem]">{pr.body}</p>
                  {pr.tech?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {pr.tech.map((tech) => (
                        <span key={tech} className="rounded-full bg-navy/[0.04] px-2.5 py-1 text-[0.72rem] text-navy-500">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- mentors */}
      {/* Who actually teaches this program. Drawn from the shared mentor list
          and filtered by slug, so a mentor is written once and appears on each
          program they teach. Absent entirely when nobody is assigned — better
          an omission than a section implying we cannot say who teaches it. */}
      {mentors.length > 0 && (
        <section id="mentors" className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <SectionHead
              eyebrow="Who teaches this"
              title="Learn from people who have"
              accent="done the job."
              lede="You are matched with a mentor for the whole program — not a support queue."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {mentors.map((m, i) => (
                <article key={m.name} className="overflow-hidden rounded-[20px] border border-navy-100 bg-white">
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
                    <p className="mt-1.5 text-[0.81rem] text-navy-500 sm:min-h-[2.43rem]">{m.focus}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------- career services */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-6">
          <SectionHead
            eyebrow="Placement support"
            title="Everything between your first class"
            accent="and your first offer."
          />
          <ol className="grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAREER_SERVICES.map((s, i) => (
              <li key={s} className="rounded-[18px] border border-navy-100 bg-paper p-5">
                <span className="text-[0.7rem] font-bold tabular-nums text-teal-ink">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="mt-2 text-[0.9rem] font-medium text-navy">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- fees */}
      <section id="fees" className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-6">
          <SectionHead
            eyebrow="Program fee"
            title="Simple, and mostly"
            accent="paid later."
            lede={fees.emi ? `EMI option available: ${fees.emi}.` : null}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-navy-100 bg-white p-7">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-navy-400">
                Registration &middot; pay upfront
              </p>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-[2.3rem] font-extrabold tracking-tight text-navy">{fees.registration}</span>
                {fees.registrationWas && (
                  <span className="text-[1.1rem] text-navy-300 line-through">{fees.registrationWas}</span>
                )}
              </div>
              <p className="mt-2 text-[0.88rem] text-navy-500">{fees.registrationNote}</p>
              <a href="#enquire" className="pbtn-outline mt-6">Apply now &rarr;</a>
            </div>

            <div className="relative overflow-hidden rounded-[24px] bg-navy-900 p-7 text-white">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 54% 78% at 90% 14%, rgba(0,152,157,.26), transparent 62%),' +
                    'radial-gradient(ellipse 44% 66% at 6% 94%, rgba(238,89,5,.18), transparent 64%)',
                }}
              />
              <div className="relative">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-teal-300">
                  Tuition &middot; pay after placement
                </p>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-[2.3rem] font-extrabold tracking-tight">{fees.tuition}</span>
                  {fees.tuitionWas && (
                    <span className="text-[1.1rem] text-navy-300 line-through">{fees.tuitionWas}</span>
                  )}
                </div>
                <p className="mt-2 text-[0.88rem] text-navy-200">{fees.tuitionNote}</p>
                <a href="#enquire" className="pbtn-white mt-6">Talk to a counsellor &rarr;</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- faq */}
      <section id="faq" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-6">
          <SectionHead eyebrow="Questions" title="Before you" accent="apply." />
          <div className="mx-auto max-w-3xl">
            {[...(d.faq || []), ...PROGRAM_FAQ].map(([q, a], i) => (
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

      {/* ---------------------------------------------- hiring partners */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-6">
          <SectionHead eyebrow="Hiring network" title="Where we make" accent="introductions." />
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-navy-100 bg-navy-100 sm:grid-cols-4 lg:grid-cols-6">
            {COMPANIES.map((c) => (
              <div key={c} className="bg-white px-2 py-6 text-center text-[0.87rem] font-bold tracking-tight text-navy-300">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- enquire */}
      <section id="enquire" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <SectionHead
                eyebrow="Get in touch"
                title="Talk to a counsellor about"
                accent={program.name + '.'}
                lede="Tell us where you are now. We will tell you honestly whether this program fits — including if it does not."
                className="mb-7"
              />
              <p className="text-[0.9rem] text-navy-400">{program.forWhom}</p>
            </div>
            <EnquiryForm />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- other programs */}
      {related.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <SectionHead eyebrow="Other programs" title="Not quite" accent="the right fit?" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProgramCard
                  key={p.slug}
                  program={p}
                  index={LIVE_PROGRAMS.indexOf(p)}
                  href={`/programs/${p.slug}`}
                  showActionLabel
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <PublicFooter />
      <PublicFloats />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';

import { CATEGORIES, LIVE_COURSES } from '../../data/courses';
import CourseCard from './CourseCard';
import { PublicFloats, PublicFooter, PublicHeader } from './PublicChrome';

/*
 * The courses page. Course detail pages are the next piece of work — until
 * they exist, the card action routes to the enquiry form rather than to a
 * page that is not there yet.
 */

export default function Courses() {
  const [cat, setCat] = useState('all');

  useEffect(() => {
    document.title = 'Courses — MOP Careers';
  }, []);

  const shown = useMemo(
    () => (cat === 'all' ? LIVE_COURSES : LIVE_COURSES.filter((c) => c.category === cat)),
    [cat],
  );

  const toEnquiry = () => {
    document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />

      <section className="px-6 pt-14 text-center sm:pt-20">
        <div className="mx-auto max-w-[1240px]">
          <span className="eyebrow justify-center">Courses</span>
          <h1 className="mx-auto mt-4 max-w-3xl text-[clamp(2.1rem,4.6vw,3.3rem)] font-extrabold leading-[1.05] tracking-tight text-navy">
            {LIVE_COURSES.length} career tracks. <span className="ser text-teal">One way of paying.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[1.02rem] text-navy-500">
            Every course runs live with a mentor, ends in real project work, and carries the
            same placement support and pay-after-placement terms.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => {
              const active = c.id === cat;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-2 text-[0.85rem] font-semibold transition ${
                    active
                      ? 'border-navy bg-navy text-white'
                      : 'border-navy-100 bg-white text-navy-500 hover:border-teal hover:text-teal-ink'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <p className="mb-8 text-center text-[0.82rem] text-navy-400" aria-live="polite">
            {shown.length} {shown.length === 1 ? 'course' : 'courses'}
          </p>

          {shown.length === 0 ? (
            <p className="py-12 text-center text-navy-400">
              No courses in this category yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((c) => (
                <CourseCard
                  key={c.slug}
                  course={c}
                  /* Numbering follows the full catalogue, so a course keeps
                     the same index whichever filter is applied. */
                  index={LIVE_COURSES.indexOf(c)}
                  onOpen={toEnquiry}
                  actionLabel="Enquire"
                  /* Every card here is the reason for the page, so all of them
                     keep a named action rather than a bare arrow. */
                  showActionLabel
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="enquire" className="pb-16 sm:pb-24">
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
                Not sure which one <span className="ser text-[1.06em] text-orange-300">fits you?</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-navy-200">
                Book a free call. We&apos;ll look at your background and tell you honestly
                which track makes sense.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href="/#enquire" className="pbtn-white">Book a free 1:1 call &rarr;</a>
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

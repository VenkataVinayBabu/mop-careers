import { useEffect } from 'react';

import { PublicFloats, PublicFooter, PublicHeader, useHashScroll } from './PublicChrome';
import { LEGAL_DOCS } from '../../data/legal';

/*
 * The three legal pages — privacy, terms and refund — rendered from the
 * structured copy in `data/legal.js`.
 *
 * One component for all three so they cannot drift apart in styling, and so a
 * fourth policy is a data entry rather than another page. Clause numbers come
 * from the array index rather than being typed into each heading: MOP's own
 * pages number them, and hand-numbered headings go wrong the first time a
 * clause is inserted in the middle.
 */

function Block({ block }) {
  if (typeof block === 'string') {
    return <p className="mt-4 text-[0.95rem] leading-relaxed text-navy-500">{block}</p>;
  }

  if (block.list) {
    return (
      <ul className="mt-4 grid gap-2.5">
        {block.list.map((item) => (
          <li key={item} className="flex gap-3 text-[0.95rem] leading-relaxed text-navy-500">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.defs) {
    return (
      <dl className="mt-4 grid gap-3 rounded-xl border border-navy-100 bg-navy-50/60 p-5">
        {block.defs.map(([label, value]) => (
          <div key={label} className="grid gap-0.5 sm:grid-cols-[13rem_1fr] sm:gap-4">
            <dt className="text-[0.8rem] font-semibold uppercase tracking-wide text-navy-400">
              {label}
            </dt>
            {/* Emails become links — on a legal page the contact address is the
                one thing a reader actually wants to act on. */}
            <dd className="text-[0.92rem] text-navy-600">
              {value.includes('@') && !value.includes(' ') ? (
                <a href={`mailto:${value}`} className="font-medium text-teal hover:underline">
                  {value}
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className="mt-5">
      <h3 className="text-[0.95rem] font-semibold text-navy">{block.sub}</h3>
      {block.p && (
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-navy-500">{block.p}</p>
      )}
    </div>
  );
}

export default function StaticPage({ slug }) {
  useHashScroll();
  const doc = LEGAL_DOCS[slug];

  useEffect(() => {
    if (doc) document.title = `${doc.title} — MOP Careers`;
  }, [doc]);

  if (!doc) return null;

  return (
    <div className="bg-paper">
      <PublicHeader />

      <main>
        <section className="bg-navy-900 py-16 text-center sm:py-20">
          <div className="mx-auto max-w-[820px] px-6">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-teal-300">
              {doc.eyebrow}
            </span>
            <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{doc.title}</h1>
            <p className="mx-auto mt-4 max-w-[640px] text-navy-200">{doc.intro}</p>
          </div>
        </section>

        <div className="mx-auto max-w-[820px] px-6 py-12 sm:py-16">
          {/* The header strip MOP's own pages carry: when it was last changed,
              and who it is from. */}
          <div className="flex flex-wrap gap-x-10 gap-y-3 rounded-xl border border-navy-100 bg-white p-5">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-navy-400">
                Last updated
              </p>
              <p className="mt-0.5 text-[0.92rem] font-medium text-navy">{doc.lastUpdated}</p>
            </div>
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-navy-400">
                Company
              </p>
              <p className="mt-0.5 text-[0.92rem] font-medium text-navy">{doc.company}</p>
            </div>
            {doc.contactPerson && (
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-navy-400">
                  Contact person
                </p>
                <p className="mt-0.5 text-[0.92rem] font-medium text-navy">{doc.contactPerson}</p>
              </div>
            )}
          </div>

          {doc.preamble && (
            <p className="mt-8 text-[0.95rem] leading-relaxed text-navy-600">{doc.preamble}</p>
          )}

          {doc.callouts && (
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {doc.callouts.map((c) => (
                <div key={c.value} className="rounded-xl border border-navy-100 bg-white p-5 text-center">
                  <p className="font-semibold text-navy">{c.value}</p>
                  <p className="mt-1 text-[0.8rem] text-navy-400">{c.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 grid gap-9">
            {doc.sections.map((section, i) => (
              <section key={section.heading} id={`clause-${i + 1}`} className="scroll-mt-24">
                <h2 className="text-lg font-bold text-navy">
                  <span className="mr-2 text-teal-ink">{i + 1}.</span>
                  {section.heading}
                </h2>
                {section.blocks.map((block, j) => (
                  <Block key={typeof block === 'string' ? block.slice(0, 40) : j} block={block} />
                ))}
              </section>
            ))}
          </div>

          {doc.footnote && (
            <p className="mt-10 rounded-xl border border-teal-200 bg-teal-50/60 p-5 text-[0.92rem] leading-relaxed text-navy-700">
              <strong className="font-semibold">Note: </strong>
              {doc.footnote}
            </p>
          )}
        </div>
      </main>

      <PublicFooter />
      <PublicFloats />
    </div>
  );
}

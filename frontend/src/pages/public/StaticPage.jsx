import { Link } from 'react-router-dom';

import { PublicFloats, PublicFooter, PublicHeader, useHashScroll } from './PublicChrome';

/*
 * The footer links to Privacy Policy, Terms of Service, Refund Policy and
 * Careers. MOP has the wording for the legal three and will supply it; until
 * then these routes exist so the links are not 404s, which on a marketing site
 * reads as a broken company rather than an unfinished page.
 *
 * Replacing one is deliberately a small job: drop the real copy in as `body`
 * below and delete the placeholder paragraph. Nothing else here needs touching.
 */
const PAGES = {
  'privacy-policy': {
    title: 'Privacy Policy',
    intro: 'How MOP Careers collects, uses and protects your personal information.',
  },
  'terms-of-service': {
    title: 'Terms of Service',
    intro: 'The terms you agree to when you use MOP Careers.',
  },
  'refund-policy': {
    title: 'Refund Policy',
    intro: 'When a fee can be refunded, and how to request it.',
  },
};

export default function StaticPage({ slug }) {
  useHashScroll();
  const page = PAGES[slug];

  return (
    <div className="bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-[820px] px-6 py-16 sm:py-20">
        <h1 className="text-3xl font-bold text-navy sm:text-4xl">{page.title}</h1>
        <p className="mt-3 text-navy-400">{page.intro}</p>

        <div className="mt-10 rounded-2xl border border-navy-100 bg-white p-7">
          <p className="text-navy-500">
            We are putting this page together. If you need this information before it is
            published, get in touch and we will send it to you directly.
          </p>
          <Link to="/#enquire" className="pbtn-primary mt-6 inline-flex">
            Contact us &rarr;
          </Link>
        </div>
      </main>
      <PublicFooter />
      <PublicFloats />
    </div>
  );
}

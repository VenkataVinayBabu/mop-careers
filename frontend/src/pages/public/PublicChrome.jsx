import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import Logo from '../../components/Logo';
import { SITE, whatsappLink } from '../../data/site';

/*
 * Header, footer and the floating actions, shared by every public page.
 *
 * On the sticky bar: the announcement strip is NOT sticky — it scrolls away
 * and the nav alone pins to the top. An earlier version pinned the nav at
 * `top: 36px` to sit below the strip, which left the header visibly
 * misaligned while scrolling back up. Only one thing sticks now.
 */

const NAV = [
  { id: 'courses', label: 'Courses', to: '/courses' },
  { id: 'process', label: 'How it works' },
  { id: 'outcomes', label: 'Outcomes' },
  { id: 'mentors', label: 'Mentors' },
  { id: 'stories', label: 'Stories' },
  { id: 'faq', label: 'FAQ' },
];

function WhatsAppIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.1 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2 .1.3 0 .4l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1.9 2 1.2 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.2.3-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.6-.1 1.2Z" />
    </svg>
  );
}

/** WhatsApp where a number exists, otherwise the enquiry form. */
export function contactHref() {
  return whatsappLink() || '/#enquire';
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Section anchors live on the landing page. From /courses we route home
  // first, then let the landing page's hash effect do the scrolling.
  const goToSection = (id) => (e) => {
    e.preventDefault();
    setOpen(false);
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    navigate({ pathname: '/', hash: `#${id}` });
  };

  const linkFor = (item) =>
    item.to ? (
      <Link
        key={item.id}
        to={item.to}
        onClick={() => setOpen(false)}
        className="text-sm font-medium text-navy transition hover:text-teal-ink"
      >
        {item.label}
      </Link>
    ) : (
      <a
        key={item.id}
        href={`/#${item.id}`}
        onClick={goToSection(item.id)}
        className="text-sm font-medium text-navy transition hover:text-teal-ink"
      >
        {item.label}
      </a>
    );

  return (
    <>
      {/* Announcement — scrolls away with the page. */}
      <div className="bg-navy-900 text-[0.78rem] text-navy-200">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-2">
          <p>
            <span className="mr-2 rounded-full bg-orange px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-white">
              {SITE.announcementTag}
            </span>
            {SITE.announcement}
          </p>
          <a
            href="/#enquire"
            onClick={goToSection('enquire')}
            className="hidden font-semibold text-orange-300 transition hover:text-white md:block"
          >
            Talk to a counsellor &rarr;
          </a>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-navy-100 bg-paper/80 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-[70px] max-w-[1240px] items-center gap-5 px-6">
          <Link to="/" aria-label="MOP Careers home">
            <Logo size="md" className="h-8 sm:h-10" />
          </Link>

          <nav className="mx-auto hidden items-center gap-7 lg:flex">{NAV.map(linkFor)}</nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Link to="/login" className="pbtn-outline pbtn-sm hidden sm:inline-flex">
              Login
            </Link>
            <a href="/#enquire" onClick={goToSection('enquire')} className="pbtn-navy pbtn-sm">
              <span className="hidden sm:inline">Book Free Call &rarr;</span>
              <span className="sm:hidden">Book call</span>
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={open}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-navy hover:bg-navy-50 lg:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 6h16M4 12h16M4 18h16'} strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <nav className="flex flex-col gap-1 border-t border-navy-100 bg-white px-6 py-3 lg:hidden">
            {NAV.map((item) => (
              <div key={item.id} className="py-1.5">
                {linkFor(item)}
              </div>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} className="py-1.5 text-sm font-medium text-navy sm:hidden">
              Login
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}

export function PublicFooter() {
  const wa = whatsappLink();
  return (
    <footer className="bg-navy-900 py-14 text-[0.86rem] text-navy-300">
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="grid gap-9 md:grid-cols-[1.6fr_1fr_1fr_1.2fr] md:gap-10">
          <div>
            <Logo variant="light" size="md" className="mb-4 h-9" />
            <p>
              A career-focused learning platform helping students, graduates and professionals
              build practical skills for real jobs — with placement support from day one.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-white">
              Courses
            </h4>
            <ul className="grid gap-2.5">
              <li><Link to="/courses" className="transition hover:text-teal-300">All courses</Link></li>
              <li><Link to="/courses" className="transition hover:text-teal-300">Data Science with AI</Link></li>
              <li><Link to="/courses" className="transition hover:text-teal-300">Gen AI &amp; Agentic AI</Link></li>
              <li><Link to="/courses" className="transition hover:text-teal-300">Full Stack Web Dev</Link></li>
              <li><Link to="/courses" className="transition hover:text-teal-300">Java Full Stack</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-white">
              Company
            </h4>
            <ul className="grid gap-2.5">
              <li><a href="/#about" className="transition hover:text-teal-300">About us</a></li>
              <li><a href="/#mentors" className="transition hover:text-teal-300">Our mentors</a></li>
              <li><a href="/#stories" className="transition hover:text-teal-300">Learner stories</a></li>
              <li><Link to="/login" className="transition hover:text-teal-300">Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-white">
              Contact
            </h4>
            {/* Blank values render as "pending" rather than an empty line or a
                link that goes nowhere. */}
            <ul className="grid gap-2.5">
              <li>{SITE.email || 'Email — pending'}</li>
              <li>{SITE.phone || 'Phone — pending'}</li>
              <li>
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" className="transition hover:text-teal-300">
                    Chat on WhatsApp
                  </a>
                ) : (
                  'WhatsApp — pending'
                )}
              </li>
              <li>{SITE.address || 'Address — pending'}</li>
            </ul>
          </div>
        </div>

        <div className="mt-11 flex flex-wrap justify-between gap-4 border-t border-navy-700 pt-6 text-[0.79rem]">
          <p>&copy; {new Date().getFullYear()} MOP Careers. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

/** Floating WhatsApp button, plus the persistent call CTA on small screens. */
export function PublicFloats() {
  const wa = whatsappLink();
  const scrollToEnquire = (e) => {
    if (wa) return;
    e.preventDefault();
    document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <a
        href={wa || '/#enquire'}
        onClick={scrollToEnquire}
        {...(wa ? { target: '_blank', rel: 'noreferrer' } : {})}
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-[78px] right-4 z-30 inline-flex items-center gap-2 rounded-full bg-[#1DA851] px-4 py-3 text-[0.86rem] font-semibold text-white shadow-lift transition hover:bg-[#16883F] lg:bottom-5"
      >
        <WhatsAppIcon className="h-5 w-5" />
        <span className="hidden lg:inline">Chat with us</span>
      </a>

      <div className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
        <a
          href="/#enquire"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="pbtn-primary w-full shadow-lift"
        >
          Book FREE 1:1 call &rarr;
        </a>
      </div>
    </>
  );
}

/** Scrolls to `#section` when a page is opened with a hash already set. */
export function useHashScroll() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }));
  }, [hash]);
}

export { WhatsAppIcon };

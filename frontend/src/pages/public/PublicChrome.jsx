import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import Logo from '../../components/Logo';
import {
  refreshPublicContent, useMentors, usePrograms, useSite, useStories, whatsappLink,
} from '../../data/siteSettings';

/*
 * Header, footer and the floating actions, shared by every public page.
 *
 * On the sticky bar: the announcement strip is NOT sticky — it scrolls away
 * and the nav alone pins to the top. An earlier version pinned the nav at
 * `top: 36px` to sit below the strip, which left the header visibly
 * misaligned while scrolling back up. Only one thing sticks now.
 */

/*
 * Every item is a section on the landing page — there is no separate programs
 * page any more, since all of them already appear on the home page and a second
 * copy was only somewhere else to maintain.
 *
 * `home` scrolls to the top; `menu` opens the programme dropdown but still
 * scrolls to the section when its own label is activated.
 */
const NAV = [
  { id: 'top', label: 'Home' },
  { id: 'programs', label: 'Programs', menu: true },
];

/* 'Most popular' is too long for a dropdown pill; the card keeps the full
   wording. Anything else shows as-is. */
const navBadge = (badge) => (badge === 'Most popular' ? 'Hot' : badge);

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
  const [open, setOpen] = useState(false);          // mobile drawer
  const [menuOpen, setMenuOpen] = useState(false);  // programmes dropdown
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const site = useSite();
  const mentors = useMentors();
  const stories = useStories();
  const programs = usePrograms();

  /* Every public page renders this header, so this is the one place the live
     settings need asking for. The call itself is deduplicated, and the page is
     already showing readable values while it is in flight. */
  useEffect(() => {
    refreshPublicContent();
  }, []);

  /* Close the dropdown on Escape or on a click outside it. Without the outside
     click it stays open behind whatever you click next, which feels stuck. */
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [menuOpen]);

  /* Sections all live on the landing page. From anywhere else, route home and
     let the landing page's hash effect do the scrolling. `top` scrolls up
     rather than looking for an element. */
  const goToSection = (id) => (e) => {
    if (e) e.preventDefault();
    setOpen(false);
    setMenuOpen(false);
    if (pathname !== '/') {
      navigate({ pathname: '/', hash: `#${id}` });
      return;
    }
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const linkClass = 'text-sm font-medium text-navy transition hover:text-teal-ink';

  /*
   * Inlined rather than declared as its own component inside this one. A
   * component defined in a render body gets a new identity on every state
   * change, so React tears the subtree down and rebuilds it — which fires
   * mouseleave on the node being removed and closes the menu the instant
   * hovering opens it.
   */
  const programsMenu = (
    <div
      key="programs"
      ref={menuRef}
      className="relative"
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={() => setMenuOpen(false)}
      /* Focus opens it too, or the menu is unreachable by keyboard — hover is
         not an interaction everyone has. Closes only when focus leaves the
         whole group, so tabbing through the entries keeps it open. */
      onFocus={() => setMenuOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="true"
        onClick={goToSection('programs')}
        className={`${linkClass} inline-flex items-center gap-1`}
      >
        Programs
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute left-1/2 top-full z-50 w-[19rem] -translate-x-1/2 pt-3">
          <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white py-3 shadow-pop">
            <p className="px-5 pb-2 text-[0.66rem] font-bold uppercase tracking-[0.13em] text-teal-ink">
              Pay After Placement
            </p>
            <ul>
              {programs.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`/programs/${p.slug}`}
                    onClick={() => { setMenuOpen(false); setOpen(false); }}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 text-[0.9rem] text-navy transition hover:bg-navy-50 hover:text-teal-ink"
                  >
                    {p.name}
                    {p.badge && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-white ${
                          p.badge === 'New' ? 'bg-teal' : 'bg-navy'
                        }`}
                      >
                        {navBadge(p.badge)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  /* The landing page drops a section when an admin has removed everything in
     it, so the nav entry has to go with it — otherwise it is a link that
     scrolls nowhere. */
  const sectionIsEmpty = { mentors: mentors.length === 0, stories: stories.length === 0 };
  const navItems = NAV.filter((item) => !sectionIsEmpty[item.id]);

  const linkFor = (item) =>
    item.menu ? (
      programsMenu
    ) : (
      <a key={item.id} href={`/#${item.id}`} onClick={goToSection(item.id)} className={linkClass}>
        {item.label}
      </a>
    );

  return (
    <>
      {/* Announcement — scrolls away with the page, and an admin can switch it
          off entirely. The tag is dropped rather than shown empty when it has
          been cleared, so the strip never carries a stray orange pill. */}
      {site.announcementEnabled && site.announcement && (
        <div className="bg-navy-900 text-[0.78rem] text-navy-200">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-2">
            <p>
              {site.announcementTag && (
                <span className="mr-2 rounded-full bg-orange px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-white">
                  {site.announcementTag}
                </span>
              )}
              {site.announcement}
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
      )}

      <header className="sticky top-0 z-40 border-b border-navy-100 bg-paper/80 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-[70px] max-w-[1240px] items-center gap-5 px-6">
          <Link to="/" aria-label="MOP Careers home">
            <Logo size="md" className="h-8 sm:h-10" />
          </Link>

          <nav className="mx-auto hidden items-center gap-7 lg:flex">{navItems.map(linkFor)}</nav>

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

        {/* Mobile drawer. The programmes list is expanded inline rather than
            hidden behind a hover dropdown, which does not exist on touch. */}
        {open && (
          <nav className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto border-t border-navy-100 bg-white px-6 py-3 lg:hidden">
            {navItems.map((item) => (
              <div key={item.id} className="py-1.5">
                <a href={`/#${item.id}`} onClick={goToSection(item.id)} className={linkClass}>
                  {item.label}
                </a>

                {item.menu && (
                  <ul className="mt-2 grid gap-1 border-l border-navy-100 pl-4">
                    {programs.map((p) => (
                      <li key={p.slug}>
                        <Link
                          to={`/programs/${p.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between gap-2 py-1.5 text-[0.85rem] text-navy-500"
                        >
                          {p.name}
                          {p.badge && (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.08em] text-white ${
                                p.badge === 'New' ? 'bg-teal' : 'bg-navy'
                              }`}
                            >
                              {navBadge(p.badge)}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
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

/* Social icons, drawn inline rather than pulled from lucide-react: brand
   glyphs are not part of that set, and four <path>s is cheaper than a
   dependency. Only the links an admin has actually filled in are rendered. */
const SOCIAL_ICONS = {
  linkedin: 'M4.98 3.5a2 2 0 1 1-.02 4 2 2 0 0 1 .02-4ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.75-1.95C21.6 8.75 22 11.1 22 14.1V21h-4v-6.1c0-1.45-.03-3.3-2-3.3-2 0-2.3 1.57-2.3 3.2V21h-4V9Z',
  instagram: 'M12 2.2c3.2 0 3.6 0 4.8.07 1.2.06 1.8.25 2.2.42.6.22 1 .49 1.4.9.42.4.69.8.91 1.4.17.4.36 1 .42 2.2.06 1.2.07 1.6.07 4.8s0 3.6-.07 4.8c-.06 1.2-.25 1.8-.42 2.2-.22.6-.49 1-.9 1.4-.4.42-.8.69-1.4.91-.4.17-1 .36-2.2.42-1.2.06-1.6.07-4.8.07s-3.6 0-4.8-.07c-1.2-.06-1.8-.25-2.2-.42-.6-.22-1-.49-1.4-.9-.42-.4-.69-.8-.91-1.4-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.8c.06-1.2.25-1.8.42-2.2.22-.6.49-1 .9-1.4.4-.42.8-.69 1.4-.91.4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 3.05A6.75 6.75 0 1 0 18.75 12 6.75 6.75 0 0 0 12 5.25Zm0 11.13A4.38 4.38 0 1 1 16.38 12 4.38 4.38 0 0 1 12 16.38Zm6.95-11.4a1.58 1.58 0 1 1-1.58-1.57 1.58 1.58 0 0 1 1.58 1.57Z',
  youtube: 'M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.02V8.98L15.2 12 10 15.02Z',
  facebook: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z',
};

const SOCIAL_LABELS = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
};

export function PublicFooter() {
  const site = useSite();
  /* The footer lists every programme too. Its own subscription — it is a
     separate component from the header and shares none of its scope. */
  const programs = usePrograms();
  const wa = whatsappLink();
  const socials = Object.entries(site.social || {}).filter(([, url]) => url);
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
              Placement Courses
            </h4>
            {/* Driven from the catalogue rather than hand-listed, so adding or
                unpublishing a program updates the footer on its own. Every entry
                points at the home page's programmes section today; once the
                detail pages land these become /programs/{slug}. */}
            <ul className="grid gap-2.5">
              {programs.map((c) => (
                <li key={c.slug}>
                  <Link to={`/programs/${c.slug}`} className="transition hover:text-teal-300">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link to="/#programs" className="font-semibold text-white transition hover:text-teal-300">
                  All programs &rarr;
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-white">
              Company
            </h4>
            <ul className="grid gap-2.5">
              <li><a href="/#about" className="transition hover:text-teal-300">About Us</a></li>
              <li><a href="/#enquire" className="transition hover:text-teal-300">Contact Us</a></li>
              <li><Link to="/careers" className="transition hover:text-teal-300">Careers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-white">
              Contact
            </h4>
            {/* Email and phone are real links, not plain text — on a phone that
                is the difference between one tap and copying it out by hand.
                A blank value still renders as "pending" rather than a dead link. */}
            <ul className="grid gap-2.5">
              <li>
                {site.email ? (
                  <a href={`mailto:${site.email}`} className="transition hover:text-teal-300">
                    {site.email}
                  </a>
                ) : (
                  'Email — pending'
                )}
              </li>
              <li>
                {site.phone ? (
                  <a
                    href={`tel:${site.phone.replace(/[^\d+]/g, '')}`}
                    className="transition hover:text-teal-300"
                  >
                    {site.phone}
                  </a>
                ) : (
                  'Phone — pending'
                )}
              </li>
              <li>
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" className="transition hover:text-teal-300">
                    Chat on WhatsApp
                  </a>
                ) : (
                  'WhatsApp — pending'
                )}
              </li>
              <li>{site.address || 'Address — pending'}</li>
            </ul>

            {/* Nothing is rendered at all until at least one link exists — a
                row of dead icons is worse than no row. */}
            {socials.length > 0 && (
              <ul className="mt-5 flex gap-2.5">
                {socials.map(([key, url]) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={SOCIAL_LABELS[key] || key}
                      title={SOCIAL_LABELS[key] || key}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-700 text-navy-200 transition hover:bg-teal hover:text-white"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d={SOCIAL_ICONS[key]} />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* The legal pages are stubs until MOP supplies the text — the links go
            in now because a footer without them looks unfinished, and they point
            at real routes rather than 404s. */}
        <div className="mt-11 flex flex-wrap items-center justify-between gap-4 border-t border-navy-700 pt-6 text-[0.79rem]">
          <p>&copy; 2020 - {new Date().getFullYear()} MOP CAREERS SOFTWARE SERVICES PVT LTD. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><Link to="/privacy-policy" className="transition hover:text-teal-300">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="transition hover:text-teal-300">Terms of Service</Link></li>
            <li><Link to="/refund-policy" className="transition hover:text-teal-300">Refund Policy</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

/** Floating WhatsApp button, plus the persistent call CTA on small screens. */
export function PublicFloats() {
  /* Subscribed purely to re-render when the settings land: `whatsappLink()`
     reads the store directly and would otherwise keep whatever it returned on
     the first paint. */
  useSite();
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

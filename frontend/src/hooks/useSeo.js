import { useEffect } from 'react';

/*
 * Per-page title, description and canonical URL.
 *
 * WHY NOT react-helmet-async. It is the usual answer and it would be a new
 * dependency for what is forty lines of DOM writing. This is a marketing site
 * with seven public routes, not an app that needs a full head manager.
 *
 * WHAT THIS FIXES. Every route used to serve the one title and description
 * baked into index.html, so nine programme pages looked to Google like a
 * single page. Google executes JavaScript, so it does see what this sets.
 *
 * WHAT THIS DOES NOT FIX, and it is worth being clear about it. WhatsApp,
 * LinkedIn, Slack and X do NOT run JavaScript — their crawlers read the HTML
 * exactly as served and never boot the app. Their preview cards therefore come
 * from the static tags in index.html and are the same for every page. Making
 * previews per-page needs prerendering at build time; that is a bigger change
 * and is recorded in CLAUDE.md rather than smuggled in here.
 */

const SITE_NAME = 'MOP Careers';

// The canonical home of this site. MOP publishes on more than one domain
// (mopcareers.com, .in and .co.in), and without a canonical URL search engines
// treat them as competing copies and split the ranking between them. Decided
// 4 Sep 2026: the .com is primary.
const CANONICAL_ORIGIN = 'https://mopcareers.com';

function upsert(selector, create, content) {
  if (!content) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  if (el.tagName === 'LINK') el.setAttribute('href', content);
  else el.setAttribute('content', content);
}

function meta(name, content) {
  upsert(`meta[name="${name}"]`, () => {
    const el = document.createElement('meta');
    el.setAttribute('name', name);
    return el;
  }, content);
}

function og(property, content) {
  upsert(`meta[property="${property}"]`, () => {
    const el = document.createElement('meta');
    el.setAttribute('property', property);
    return el;
  }, content);
}

/**
 * @param {object} opts
 * @param {string} opts.title    Page title, without the site name — it is appended.
 * @param {string} opts.description  Under ~155 characters or Google truncates it.
 * @param {string} [opts.path]   Path for the canonical URL. Defaults to the current one.
 * @param {boolean} [opts.noindex]  Keep this page out of search results.
 */
export default function useSeo({ title, description, path, noindex = false }) {
  useEffect(() => {
    // "Page — MOP Careers", except on the home page where that would stutter.
    const full = title && !title.includes(SITE_NAME) ? `${title} — ${SITE_NAME}` : title || SITE_NAME;
    document.title = full;

    const url = CANONICAL_ORIGIN + (path || window.location.pathname);

    meta('description', description);
    og('og:title', full);
    og('og:description', description);
    og('og:url', url);
    og('og:type', 'website');
    og('og:site_name', SITE_NAME);
    meta('twitter:title', full);
    meta('twitter:description', description);

    upsert('link[rel="canonical"]', () => {
      const el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      return el;
    }, url);

    // Login and the password screens have no business in search results, and
    // a signed-out crawler would only ever see the form anyway.
    const robots = document.head.querySelector('meta[name="robots"]');
    if (noindex) {
      meta('robots', 'noindex, nofollow');
    } else if (robots) {
      robots.setAttribute('content', 'index, follow');
    }
  }, [title, description, path, noindex]);
}

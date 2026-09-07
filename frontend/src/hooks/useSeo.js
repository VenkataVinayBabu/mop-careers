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

/*
 * Per-page structured data (JSON-LD).
 *
 * WHAT IT BUYS. Titles and descriptions tell Google what a page SAYS;
 * structured data tells it what the page IS. A programme page marked up as a
 * Course can carry the provider and the breadcrumb trail into the result
 * itself, and the site-wide Organization block in index.html is what ties
 * mopcareers.com to the brand rather than leaving Google to infer it from
 * three domains publishing similar copy.
 *
 * ONE BLOCK PER PAGE, REMOVED ON THE WAY OUT. Client-side navigation does not
 * clear the head, so without the cleanup a visitor who browsed three
 * programmes would leave Google three Course blocks describing three different
 * courses on one URL — worse than no markup at all, because contradictory
 * structured data is a reason to distrust all of it.
 *
 * The static Organization block in index.html is deliberately NOT managed
 * here: it is true on every page, and a crawler that never runs the app should
 * still get it.
 */
const LD_ID = 'page-structured-data';

function structuredData(payload) {
  document.getElementById(LD_ID)?.remove();
  if (!payload) return;
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.id = LD_ID;
  el.textContent = JSON.stringify(payload);
  document.head.appendChild(el);
}

/**
 * @param {object} opts
 * @param {string} opts.title    Page title, without the site name — it is appended.
 * @param {string} opts.description  Under ~155 characters or Google truncates it.
 * @param {string} [opts.path]   Path for the canonical URL. Defaults to the current one.
 * @param {boolean} [opts.noindex]  Keep this page out of search results.
 * @param {object|object[]} [opts.jsonLd]  Schema.org objects for this page.
 */
export default function useSeo({ title, description, path, noindex = false, jsonLd = null }) {
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
    /* Re-asserted on every route, not just left to index.html. A route change
       is a client-side navigation, so the tags in the static head keep
       whatever the previous page set unless each one is written again — and
       an og:image left pointing at a stale value is the sort of thing nobody
       notices until a link is already shared. */
    og('og:image', `${CANONICAL_ORIGIN}/og-card.png`);
    meta('twitter:card', 'summary_large_image');
    meta('twitter:image', `${CANONICAL_ORIGIN}/og-card.png`);
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

    structuredData(jsonLd);
    return () => structuredData(null);
    // jsonLd is an object literal built during render, so it is a new
    // reference every time — serialised for the dependency list, which
    // compares by value and keeps this from rewriting the tag on every render.
  }, [title, description, path, noindex, JSON.stringify(jsonLd)]);
}

/* Helpers so a page describes itself in one readable call rather than
   assembling schema.org shapes inline. */
export const ORIGIN = CANONICAL_ORIGIN;

/** The trail shown under a result: MOP Careers > Programs > Data Science. */
export function breadcrumbs(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path_], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: CANONICAL_ORIGIN + path_,
    })),
  };
}

/**
 * A programme, as a schema.org Course.
 *
 * Only fields MOP can stand behind. `offers` and `hasCourseInstance` are
 * omitted on purpose: Google reads them as a price and a scheduled sitting,
 * and this catalogue has neither a fixed price per programme nor published
 * cohort dates. Marking up a figure the site cannot honour is worse than
 * carrying no Course markup at all.
 */
export function courseSchema({ name, description, slug, provider = SITE_NAME }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    url: `${CANONICAL_ORIGIN}/programs/${slug}`,
    provider: {
      '@type': 'Organization',
      name: provider,
      sameAs: CANONICAL_ORIGIN,
    },
  };
}

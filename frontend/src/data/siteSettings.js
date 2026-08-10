/*
 * ============================================================================
 *  LIVE SITE SETTINGS — the admin-editable half of site.js.
 * ============================================================================
 *
 *  The problem this solves. The public site used to be entirely static, so it
 *  painted instantly. Now that an admin can edit the contact details, the page
 *  needs values from an API that runs on a free Render instance and takes
 *  30-60 seconds to wake from idle. Fetching them the ordinary way would mean
 *  the first visitor after a quiet period stares at an empty header.
 *
 *  So nothing here ever blocks a render:
 *
 *    1. SITE_DEFAULTS is compiled into the bundle and paints immediately.
 *    2. A localStorage snapshot of the last API answer overlays it
 *       synchronously, so a returning visitor sees the real values on frame
 *       one even while the backend is still asleep.
 *    3. The API answer overlays that when it arrives, and is cached for next
 *       time.
 *
 *  A failed or slow fetch therefore costs a slightly stale footer, never a
 *  blank one. That is what makes the always-on backend an upgrade rather than
 *  a prerequisite.
 *
 *  This is a plain external store rather than React context on purpose:
 *  `whatsappLink()` and `contactHref()` are called from ordinary functions,
 *  not only from components, and a context would force every one of those call
 *  sites to become a hook.
 * ============================================================================
 */
import { useSyncExternalStore } from 'react';

import { api } from '../api/client';
import { PROGRAMS as PROGRAM_DEFAULTS } from './programs';
import {
  COMPANIES as COMPANY_DEFAULTS,
  OUTCOMES as OUTCOME_DEFAULTS,
  STATS as STAT_DEFAULTS,
  MENTORS as MENTOR_DEFAULTS,
  PLACEMENTS_TICKER as TICKER_DEFAULTS,
  SITE_DEFAULTS,
  STORIES as STORY_DEFAULTS,
} from './site';

const CACHE_KEY = 'mop_site_settings';
const MENTORS_CACHE_KEY = 'mop_site_mentors';
const STORIES_CACHE_KEY = 'mop_site_stories';
const PARTNERS_CACHE_KEY = 'mop_site_partners';
const PROGRAMS_CACHE_KEY = 'mop_site_programs';
const STATS_CACHE_KEY = 'mop_site_statistics';

/* The API speaks snake_case and a flat shape; the site speaks camelCase with
   the social links nested. One mapper here, rather than either side bending to
   the other. Every field falls back to its default, so an older cached
   snapshot missing a newly added key still reads sensibly. */
function fromApi(row) {
  if (!row || typeof row !== 'object') return { ...SITE_DEFAULTS };
  const pick = (key, fallback) => (typeof row[key] === 'string' ? row[key] : fallback);
  return {
    whatsapp: pick('whatsapp', SITE_DEFAULTS.whatsapp),
    whatsappMessage: pick('whatsapp_message', SITE_DEFAULTS.whatsappMessage),
    phone: pick('phone', SITE_DEFAULTS.phone),
    email: pick('email', SITE_DEFAULTS.email),
    address: pick('address', SITE_DEFAULTS.address),
    announcement: pick('announcement', SITE_DEFAULTS.announcement),
    announcementTag: pick('announcement_tag', SITE_DEFAULTS.announcementTag),
    announcementEnabled:
      typeof row.announcement_enabled === 'boolean'
        ? row.announcement_enabled
        : SITE_DEFAULTS.announcementEnabled,
    social: {
      linkedin: pick('social_linkedin', ''),
      instagram: pick('social_instagram', ''),
      youtube: pick('social_youtube', ''),
      facebook: pick('social_facebook', ''),
    },
    /* Renamed into the shape the programme page renders, so a per-programme
       override can be merged straight over it. */
    fees: {
      registration: pick('fee_registration', SITE_DEFAULTS.fees.registration),
      registrationWas: pick('fee_registration_was', SITE_DEFAULTS.fees.registrationWas),
      registrationNote: pick('fee_registration_note', SITE_DEFAULTS.fees.registrationNote),
      tuition: pick('fee_tuition', SITE_DEFAULTS.fees.tuition),
      tuitionWas: pick('fee_tuition_was', SITE_DEFAULTS.fees.tuitionWas),
      tuitionNote: pick('fee_tuition_note', SITE_DEFAULTS.fees.tuitionNote),
      emi: pick('fee_emi', SITE_DEFAULTS.fees.emi),
    },
  };
}

/* API rows mapped to the shapes the cards already expect. `photo` stays null
   rather than '' so `Avatar` keeps falling through to its monogram — an empty
   string is a broken <img>. Each returns null for a non-array, which is how a
   corrupted cache entry is told apart from a genuinely empty list. */
const listMapper = (map) => (rows) => (Array.isArray(rows) ? rows.map(map) : null);

const mentorsFromApi = listMapper((r) => ({
  name: r.name || '',
  photo: r.photo_url || null,
  former: r.former || '',
  focus: r.focus || '',
  programs: Array.isArray(r.programs) ? r.programs : [],
  placeholder: Boolean(r.is_placeholder),
}));

const storiesFromApi = listMapper((r) => ({
  name: r.name || '',
  photo: r.photo_url || null,
  role: r.role || '',
  quote: r.quote || '',
}));

const partnersFromApi = listMapper((r) => ({
  name: r.name || '',
  logo: r.logo_url || null,
  package: r.package_lpa || '',
}));

/* Headline statistics. `decimals` is DERIVED from the value rather than
   stored: 47.6 needs one decimal place, 1050 needs none, and asking an admin
   to keep a separate "decimal places" box in step with the number is inviting
   the one mistake nobody would spot. */
const statsFromApi = listMapper((r) => {
  const value = Number(r.value) || 0;
  const decimals = String(value).includes('.') ? String(value).split('.')[1].length : 0;
  return {
    section: r.section || 'hero',
    label: r.label || '',
    value,
    prefix: r.prefix || '',
    suffix: r.suffix || '',
    decimals,
  };
});

/* The programme catalogue. Only the flat fields need renaming — everything
   inside `detail` (headline, why, roles, syllabus, projects, faq) already
   uses the keys the pages render, which is what makes this a swap rather
   than a rewrite. */
const programsFromApi = listMapper((r) => ({
  slug: r.slug,
  name: r.name || '',
  category: r.category || '',
  badge: r.badge || '',
  duration: r.duration || '',
  ctcAvg: r.ctc_avg || '',
  ctcHigh: r.ctc_high || '',
  summary: r.summary || '',
  forWhom: r.for_whom || '',
  skills: Array.isArray(r.skills) ? r.skills : [],
  featured: Boolean(r.featured),
  confirmed: r.confirmed !== false,
  published: r.published !== false,
  detail: r.detail || {},
}));

/* localStorage throws in some privacy modes, and a corrupted entry must not
   take the site down over a phone number. Every access swallows failure. */
function readCache(key, parse) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? parse(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* nothing to do — the next page load just falls back to the defaults */
  }
}

/* A minimal external store. useSyncExternalStore compares snapshots by
   identity, so the value is replaced wholesale on every change and never
   mutated in place. */
function createStore(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set(next) {
      value = next;
      listeners.forEach((fn) => fn());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const settingsStore = createStore(
  readCache(CACHE_KEY, fromApi) || { ...SITE_DEFAULTS },
);

/*
 * The three lists differ from settings in one important way: an EMPTY LIST IS
 * A REAL ANSWER. If an admin deletes every mentor the site must show none, not
 * fall back to the copy baked into the bundle — otherwise deleting a
 * fabricated mentor would appear to work and then quietly undo itself.
 *
 * That is why `??` and not `||` below, and why these tables ship seeded rather
 * than empty: the database is the source of truth from the first deploy, and
 * the baked lists are only ever the first paint.
 */
function createListStore(cacheKey, mapper, defaults) {
  const store = createStore(readCache(cacheKey, mapper) ?? defaults);
  return {
    ...store,
    /** Adopt an API payload — used by the fetch below and by the admin
     *  screens, which already have the saved response and should not have to
     *  re-fetch it. A non-array is ignored rather than blanking the list. */
    apply(rows) {
      const mapped = mapper(rows);
      if (!mapped) return;
      store.set(mapped);
      writeCache(cacheKey, rows);
    },
    use() {
      return useSyncExternalStore(store.subscribe, store.get, store.get);
    },
  };
}

const mentorsStore = createListStore(MENTORS_CACHE_KEY, mentorsFromApi, MENTOR_DEFAULTS);
const storiesStore = createListStore(STORIES_CACHE_KEY, storiesFromApi, STORY_DEFAULTS);

/* The two hardcoded lists this replaces were separate: COMPANIES was a name
   grid and PLACEMENTS_TICKER was name-plus-package. One table serves both now,
   so the baked default has to be merged the same way — a company keeps its
   ticker package when it had one. */
const PARTNER_DEFAULTS = COMPANY_DEFAULTS.map((name) => ({
  name,
  logo: null,
  package: (TICKER_DEFAULTS.find(([co]) => co === name) || [])[1] || '',
}));

const partnersStore = createListStore(PARTNERS_CACHE_KEY, partnersFromApi, PARTNER_DEFAULTS);

/* The public endpoint only ever returns published programmes, so the baked
   default is filtered to match — otherwise an unpublished programme would be
   visible for the moment before the API answers. */
/* Both sections come from one endpoint and are split by `section` below —
   they were two hardcoded lists agreeing on three of their four figures. */
const statsStore = createListStore(
  STATS_CACHE_KEY,
  statsFromApi,
  [
    ...STAT_DEFAULTS.map((s) => ({ ...s, section: 'hero' })),
    ...OUTCOME_DEFAULTS.map((s) => ({ ...s, section: 'outcomes' })),
  ],
);

const programsStore = createListStore(
  PROGRAMS_CACHE_KEY,
  programsFromApi,
  PROGRAM_DEFAULTS.filter((p) => p.published),
);

/** The current settings, outside a component. */
export const getSite = () => settingsStore.get();

/** The current settings, re-rendering the component when they change. */
export function useSite() {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get, settingsStore.get);
}

/** The mentors currently on the site. */
export const getMentors = () => mentorsStore.get();
export const useMentors = () => mentorsStore.use();

export const useStories = () => storiesStore.use();

/** Every published company, for the hiring-network grid. */
export const usePartners = () => partnersStore.use();

/** The subset carrying a package, which is what the placements ticker shows.
 *  Filtered here rather than fetched separately — it is the same dozen rows. */
export const usePlacementsTicker = () => partnersStore.use().filter((p) => p.package);

/** The standard fee structure, before any per-programme override.
 *  Goes through `useSite()`: the settings store is a plain store and has no
 *  `use()` of its own, unlike the three list stores. */
export const useFees = () => useSite().fees;

/** The four figures under the hero. */
export const useHeroStats = () => statsStore.use().filter((s) => s.section === 'hero');

/** The four in the outcomes grid. */
export const useOutcomeStats = () => statsStore.use().filter((s) => s.section === 'outcomes');

/** Every published programme, in the order an admin arranged them. This is
 *  what `LIVE_PROGRAMS` used to be; the endpoint already filters. */
export const usePrograms = () => programsStore.use();

/** One programme by its URL slug, or undefined. */
export const useProgramBySlug = (slug) => programsStore.use().find((p) => p.slug === slug);

/** The enquiry form's dropdown. Derived from the live catalogue so a new
 *  programme appears in it without anyone remembering to add it. */
export function useProgramOptions() {
  return [
    ...programsStore.use().map((p) => ({ value: p.name, label: p.name })),
    { value: 'Not sure yet', label: 'Not sure yet' },
  ];
}

/** Adopt an API payload — used by the fetch below and by the admin screens,
 *  which already have the saved response and should not have to re-fetch it. */
export function applySiteSettings(row) {
  settingsStore.set(fromApi(row));
  writeCache(CACHE_KEY, row);
}

export const applyMentors = (rows) => mentorsStore.apply(rows);
export const applyStories = (rows) => storiesStore.apply(rows);
export const applyPartners = (rows) => partnersStore.apply(rows);
export const applyPrograms = (rows) => programsStore.apply(rows);
export const applyStatistics = (rows) => statsStore.apply(rows);

/* Once per page load. Several public pages ask for the refresh (whichever one
   the visitor lands on renders the header), and they should not each spend a
   request on it. */
let inFlight = null;

/** Fetch everything the marketing site can have edited under it.
 *
 *  Deliberately silent on failure, and never awaited by a render: the visitor
 *  already has readable values from the bundle and the last cached answer, and
 *  there is nothing they could do about a backend that is still waking up. */
export function refreshPublicContent() {
  if (!inFlight) {
    inFlight = Promise.all([
      api.get('/public/site-settings').then(({ data }) => applySiteSettings(data)).catch(() => null),
      api.get('/public/mentors').then(({ data }) => applyMentors(data)).catch(() => null),
      api.get('/public/stories').then(({ data }) => applyStories(data)).catch(() => null),
      api.get('/public/partners').then(({ data }) => applyPartners(data)).catch(() => null),
      api.get('/public/programs').then(({ data }) => applyPrograms(data)).catch(() => null),
      api.get('/public/statistics').then(({ data }) => applyStatistics(data)).catch(() => null),
    ]);
  }
  return inFlight;
}

/** wa.me link, or null when no number is configured — in which case the
 *  callers fall back to the enquiry form rather than opening a chat with
 *  nobody. */
export function whatsappLink() {
  const { whatsapp, whatsappMessage } = getSite();
  if (!whatsapp) return null;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappMessage || '')}`;
}

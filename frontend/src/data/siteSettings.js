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
import { MENTORS as MENTOR_DEFAULTS, SITE_DEFAULTS } from './site';

const CACHE_KEY = 'mop_site_settings';
const MENTORS_CACHE_KEY = 'mop_site_mentors';

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
  };
}

/* The API row shape for a mentor, mapped to the shape the cards already
   expect. `photo` stays null rather than '' so `Avatar` keeps falling through
   to its monogram — an empty string is a broken <img>. */
function mentorsFromApi(rows) {
  if (!Array.isArray(rows)) return null;
  return rows.map((r) => ({
    name: r.name || '',
    photo: r.photo_url || null,
    former: r.former || '',
    focus: r.focus || '',
    programs: Array.isArray(r.programs) ? r.programs : [],
    placeholder: Boolean(r.is_placeholder),
  }));
}

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
 * Mentors differ from settings in one important way: an EMPTY LIST IS A REAL
 * ANSWER. If an admin deletes every mentor the site must show none, not fall
 * back to the copy baked into the bundle — otherwise deleting a fabricated
 * mentor would appear to work and then quietly undo itself.
 *
 * That is why `??` and not `||` below, and why the mentors table ships seeded
 * rather than empty: the database is the source of truth from the first
 * deploy, and the baked list is only ever the first paint.
 */
const mentorsStore = createStore(
  readCache(MENTORS_CACHE_KEY, mentorsFromApi) ?? MENTOR_DEFAULTS,
);

/** The current settings, outside a component. */
export const getSite = () => settingsStore.get();

/** The current settings, re-rendering the component when they change. */
export function useSite() {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get, settingsStore.get);
}

/** The mentors currently on the site. */
export const getMentors = () => mentorsStore.get();

export function useMentors() {
  return useSyncExternalStore(mentorsStore.subscribe, mentorsStore.get, mentorsStore.get);
}

/** Adopt an API payload — used by the fetch below and by the admin screens,
 *  which already have the saved response and should not have to re-fetch it. */
export function applySiteSettings(row) {
  settingsStore.set(fromApi(row));
  writeCache(CACHE_KEY, row);
}

export function applyMentors(rows) {
  const mapped = mentorsFromApi(rows);
  if (!mapped) return;
  mentorsStore.set(mapped);
  writeCache(MENTORS_CACHE_KEY, rows);
}

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

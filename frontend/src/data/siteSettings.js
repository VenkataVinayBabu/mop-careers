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
import { SITE_DEFAULTS } from './site';

const CACHE_KEY = 'mop_site_settings';

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

/* localStorage throws in some privacy modes, and a corrupted entry must not
   take the site down over a phone number. Both directions swallow failure. */
function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? fromApi(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(row) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(row));
  } catch {
    /* nothing to do — the next page load just falls back to the defaults */
  }
}

let current = readCache() || { ...SITE_DEFAULTS };
const listeners = new Set();

/* useSyncExternalStore compares snapshots by identity, so `current` is
   replaced wholesale on every change and never mutated in place. */
function emit(next) {
  current = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The current settings, outside a component. */
export const getSite = () => current;

/** The current settings, re-rendering the component when they change. */
export function useSite() {
  return useSyncExternalStore(subscribe, getSite, getSite);
}

/** Adopt an API payload — used by the fetch below and by the admin form,
 *  which already has the saved response and should not have to re-fetch it. */
export function applySiteSettings(row) {
  emit(fromApi(row));
  writeCache(row);
}

/* Once per page load. Several public pages ask for the refresh (whichever one
   the visitor lands on renders the header), and they should not each spend a
   request on it. */
let inFlight = null;

export function refreshSiteSettings() {
  if (!inFlight) {
    inFlight = api
      .get('/public/site-settings')
      .then(({ data }) => {
        applySiteSettings(data);
        return data;
      })
      /* Deliberately silent. The visitor already has readable values and there
         is nothing they could do about a failure here. */
      .catch(() => null);
  }
  return inFlight;
}

/** wa.me link, or null when no number is configured — in which case the
 *  callers fall back to the enquiry form rather than opening a chat with
 *  nobody. */
export function whatsappLink() {
  const { whatsapp, whatsappMessage } = current;
  if (!whatsapp) return null;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappMessage || '')}`;
}

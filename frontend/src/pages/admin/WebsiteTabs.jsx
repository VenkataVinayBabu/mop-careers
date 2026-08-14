import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

/*
 * The Website section's tab strip.
 *
 * Its own component because everything under Admin > Website is content
 * management for the public site and shares this header. A page keeps its own
 * PageHeader below this; the tabs only say which entity you are editing.
 *
 * It also carries the standing notice for a contributor — that nothing they
 * save here is live yet. That lives with the tabs rather than on each screen
 * so it cannot be missing from one of them.
 */
const TABS = [
  { to: '/admin/website', label: 'Settings', end: true },
  { to: '/admin/website/programs', label: 'Programs' },
  { to: '/admin/website/statistics', label: 'Statistics' },
  { to: '/admin/website/mentors', label: 'Mentors' },
  { to: '/admin/website/leaders', label: 'Leadership' },
  { to: '/admin/website/stories', label: 'Stories' },
  { to: '/admin/website/partners', label: 'Hiring partners' },
  { to: '/admin/website/openings', label: 'Openings' },
];

const REVIEW_TAB = { to: '/admin/website/approvals', label: 'Approvals' };
const MINE_TAB = { to: '/admin/website/my-changes', label: 'My changes' };

export default function WebsiteTabs() {
  const { user } = useAuth();
  const isContributor = user?.role === 'contributor';
  const reviews = user?.role === 'member' || user?.role === 'admin';
  const [counts, setCounts] = useState({ pending: 0, rejected: 0 });

  useEffect(() => {
    let alive = true;
    api
      .get('/admin/website/changes')
      .then(({ data }) => {
        if (!alive) return;
        setCounts({
          pending: data.filter((c) => c.status === 'pending').length,
          rejected: data.filter((c) => c.status === 'rejected').length,
        });
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, []);

  const tabs = [...TABS, ...(reviews ? [REVIEW_TAB] : []), ...(isContributor ? [MINE_TAB] : [])];

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-navy-100">
        <nav className="-mb-px flex flex-wrap gap-1" aria-label="Website sections">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border-teal text-teal-ink'
                    : 'border-transparent text-navy-500 hover:text-navy'
                }`
              }
            >
              {tab.label}
              {tab.to === REVIEW_TAB.to && counts.pending > 0 && (
                <span className="ml-1.5 rounded-full bg-orange px-1.5 py-0.5 text-xs text-white">
                  {counts.pending}
                </span>
              )}
              {tab.to === MINE_TAB.to && counts.rejected > 0 && (
                <span className="ml-1.5 rounded-full bg-orange px-1.5 py-0.5 text-xs text-white">
                  {counts.rejected}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* `?preview` is required: / redirects a signed-in user to their own
            dashboard, so without it this opens a tab that bounces to /admin. */}
        <a
          href="/?preview=1"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost btn-sm mb-2 shrink-0"
        >
          View the site &rarr;
        </a>
      </div>

      {isContributor && (
        <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-sm text-navy-700">
          <strong className="font-semibold">Nothing you save here goes live by itself.</strong>{' '}
          Your changes are sent to a member to approve, and the pages below keep showing what
          the public sees until then.
          {counts.pending > 0 && (
            <>
              {' '}
              You have{' '}
              <NavLink to={MINE_TAB.to} className="font-semibold text-teal-ink underline">
                {counts.pending} waiting
              </NavLink>
              .
            </>
          )}
        </div>
      )}
    </>
  );
}

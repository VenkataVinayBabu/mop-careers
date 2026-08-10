import { NavLink } from 'react-router-dom';

/*
 * The Website section's tab strip.
 *
 * Its own component because everything under Admin > Website is content
 * management for the public site and shares this header. A page keeps its own
 * PageHeader below this; the tabs only say which entity you are editing.
 */
const TABS = [
  { to: '/admin/website', label: 'Settings', end: true },
  { to: '/admin/website/programs', label: 'Programs' },
  { to: '/admin/website/statistics', label: 'Statistics' },
  { to: '/admin/website/mentors', label: 'Mentors' },
  { to: '/admin/website/stories', label: 'Stories' },
  { to: '/admin/website/partners', label: 'Hiring partners' },
];

export default function WebsiteTabs() {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 border-b border-navy-100">
      <nav className="-mb-px flex gap-1" aria-label="Website sections">
        {TABS.map((tab) => (
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
  );
}

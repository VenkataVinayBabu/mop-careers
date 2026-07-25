import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const NAV = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/batches', label: 'Batches' },
    { to: '/admin/accounts', label: 'Accounts' },
  ],
  teacher: [{ to: '/teacher', label: 'My Batches', end: true }],
  student: [
    { to: '/app', label: 'Home', end: true },
    { to: '/app/curriculum', label: 'Curriculum' },
    { to: '/app/missed', label: 'Missed Classes' },
    { to: '/app/schedule', label: 'Schedule' },
  ],
};

const ROLE_LABEL = { admin: 'Administrator', teacher: 'Teacher', student: 'Student' };

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  const links = NAV[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo variant="light" size="md" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `block rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-teal text-white' : 'text-navy-200 hover:bg-navy-600 hover:text-white'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-navy-600 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">
            {initials(user?.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-navy-300">{ROLE_LABEL[user?.role]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-navy-400 px-3 py-2 text-xs font-semibold text-navy-100 transition hover:bg-navy-600 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-900/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-lift">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-navy-100 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-600 transition hover:bg-navy-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <Logo size="sm" />
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

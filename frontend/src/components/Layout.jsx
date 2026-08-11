import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronsUpDown,
  Globe,
  GraduationCap,
  HelpCircle,
  Home,
  IndianRupee,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TrendingUp,
  UserCog,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const COLLAPSE_KEY = 'mop_sidebar_collapsed';

const NAV = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/batches', label: 'Batches', icon: GraduationCap },
    { to: '/admin/accounts', label: 'Accounts', icon: UserCog },
    { to: '/admin/fees', label: 'Fees', icon: IndianRupee },
    { to: '/admin/placements', label: 'Placements', icon: Briefcase },
    { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
    { to: '/admin/doubts', label: 'Doubts', icon: MessageSquare },
    // Content management for the public site. Last, because it is the only
    // entry that edits what the outside world sees rather than the platform.
    { to: '/admin/website', label: 'Website', icon: Globe },
  ],
  // Teachers deliberately get no fees, placements or enquiries entries.
  teacher: [
    { to: '/teacher', label: 'My Batches', icon: GraduationCap, end: true },
    { to: '/teacher/doubts', label: 'Doubts', icon: MessageSquare },
  ],
  // Everything a contributor does, minus fees and enquiries, plus the queue
  // they approve from and the coordinator's follow-up list.
  member: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/website/approvals', label: 'Approvals', icon: Globe },
    { to: '/admin/batches', label: 'Batches', icon: GraduationCap },
    { to: '/admin/accounts', label: 'Accounts', icon: UserCog },
    { to: '/admin/fees', label: 'Fees', icon: IndianRupee },
    { to: '/admin/placements', label: 'Placements', icon: Briefcase },
    { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
    { to: '/watch', label: 'Follow-ups', icon: HelpCircle },
    { to: '/admin/doubts', label: 'Doubts', icon: MessageSquare },
  ],
  // No fees and no enquiries — the two things the role was defined without.
  // Website is first because it is the bulk of the job.
  contributor: [
    { to: '/admin/website', label: 'Website', icon: Globe, end: true },
    { to: '/admin/batches', label: 'Batches', icon: GraduationCap },
    { to: '/admin/accounts', label: 'Accounts', icon: UserCog },
    { to: '/admin/placements', label: 'Placements', icon: Briefcase },
    { to: '/admin/doubts', label: 'Doubts', icon: MessageSquare },
  ],
  // A read-only coordinator. Follow-ups first, because that is the job — the
  // batch list is where they go to answer a question, not where they start.
  viewer: [
    { to: '/watch', label: 'Follow-ups', icon: HelpCircle, end: true },
    { to: '/watch/batches', label: 'All Batches', icon: GraduationCap },
  ],
  student: [
    { to: '/app', label: 'Home', icon: Home, end: true },
    { to: '/app/curriculum', label: 'Curriculum', icon: BookOpen },
    { to: '/app/missed', label: 'Missed Classes', icon: HelpCircle },
    { to: '/app/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/app/applications', label: 'My Applications', icon: Briefcase },
    { to: '/app/doubts', label: 'Doubt Support', icon: MessageSquare },
    { to: '/app/progress', label: 'Progress Report', icon: TrendingUp },
  ],
};

const ROLE_LABEL = {
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
  viewer: 'Coordinator',
  member: 'Member',
  contributor: 'Contributor',
};

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/* ------------------------------------------------------------------ */
/*  Student profile menu — opens upward from the sidebar footer.       */
/* ------------------------------------------------------------------ */
function StudentProfileMenu({ user, collapsed, onNavigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (path) => {
    setOpen(false);
    onNavigate(path);
  };

  return (
    <div ref={ref} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-[17rem] overflow-hidden rounded-xl border border-navy-100 bg-white shadow-lift"
        >
          {/* identity */}
          <div className="flex items-start gap-3 px-4 pt-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal text-lg font-bold text-white">
              {initials(user?.name)[0] || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy" title={user?.name}>
                {user?.name}
              </p>
              {user?.batch_name && (
                <span className="mt-1 inline-flex items-center rounded-md bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-500">
                  Batch : {user.batch_name}
                </span>
              )}
            </div>
          </div>

          {/* quick tile — only Progress exists today */}
          <div className="px-4 pt-3">
            <button
              type="button"
              onClick={() => go('/app/progress')}
              className="flex w-full flex-col items-center gap-1 rounded-lg bg-teal-50 px-3 py-2.5 text-teal-700 transition hover:bg-teal-100"
            >
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold">Progress</span>
            </button>
          </div>

          <div className="mt-3 border-t border-navy-100">
            <button
              type="button"
              onClick={() => go('/app/profile')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
            >
              <Settings className="h-4 w-4 text-navy-400" aria-hidden="true" />
              Profile Settings
            </button>
            <button
              type="button"
              onClick={() => go('/change-password')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
            >
              <KeyRound className="h-4 w-4 text-navy-400" aria-hidden="true" />
              Reset Password
            </button>
          </div>

          <div className="border-t border-navy-100">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-orange transition hover:bg-orange-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? user?.name : undefined}
        className={`flex w-full items-center gap-3 rounded-lg py-2 transition hover:bg-navy-600 ${
          collapsed ? 'justify-center px-0' : 'px-2'
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal text-xs font-bold text-white">
          {initials(user?.name)}
        </div>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-semibold text-white">{user?.name}</span>
              <span className="block text-xs text-navy-300">{ROLE_LABEL[user?.role]}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-navy-300" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Remembered between visits so it doesn't reset on every page load.
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  );

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const links = NAV[user?.role] || [];

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const isStudent = user?.role === 'student';

  // `railMode` collapses the rail on desktop only — the mobile drawer always
  // shows full labels, since there is room for them there.
  const sidebar = (railMode) => (
    <div className="flex h-full flex-col bg-navy text-white">
      <div
        className={`flex h-16 shrink-0 items-center ${railMode ? 'justify-center px-0' : 'px-5'}`}
      >
        {railMode ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal text-sm font-extrabold text-white">
            M
          </span>
        ) : (
          <Logo variant="light" size="md" />
        )}
      </div>

      {/* When collapsed the nav must not clip, or the hover tooltips get cut
          off at the rail edge. There are few enough items that it never needs
          to scroll in that mode. */}
      <nav
        className={`flex-1 space-y-1 px-3 py-4 ${
          railMode ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'
        }`}
      >
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition ${
                  railMode ? 'justify-center px-0' : 'px-3.5'
                } ${
                  isActive
                    ? 'bg-teal text-white'
                    : 'text-navy-200 hover:bg-navy-600 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {railMode ? (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-full z-50 ml-3 origin-left scale-95 whitespace-nowrap rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lift transition duration-150 group-hover:scale-100 group-hover:opacity-100"
                >
                  {l.label}
                </span>
              ) : (
                <span className="truncate">{l.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={`shrink-0 border-t border-navy-600 ${railMode ? 'px-2 py-3' : 'p-4'}`}>
        {isStudent ? (
          <StudentProfileMenu
            user={user}
            collapsed={railMode}
            onNavigate={(p) => navigate(p)}
            onLogout={handleLogout}
          />
        ) : (
          <>
            <div
              className={`mb-3 flex items-center gap-3 ${railMode ? 'justify-center' : ''}`}
              title={railMode ? user?.name : undefined}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">
                {initials(user?.name)}
              </div>
              {!railMode && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                  <p className="text-xs text-navy-300">{ROLE_LABEL[user?.role]}</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title={railMode ? 'Sign out' : undefined}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border border-navy-400 py-2 text-xs font-semibold text-navy-100 transition hover:bg-navy-600 hover:text-white ${
                railMode ? 'px-0' : 'px-3'
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!railMode && 'Sign out'}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebar(collapsed)}

        {/* Collapse toggle, straddling the sidebar edge */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="group absolute -right-3.5 top-[4.5rem] flex h-8 w-8 items-center justify-center rounded-lg border border-navy-100 bg-white text-navy-500 shadow-card transition hover:border-teal hover:bg-teal hover:text-white"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-900/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-lift">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="absolute right-2 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-navy-200 transition hover:bg-navy-600 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {sidebar(false)}
          </aside>
        </div>
      )}

      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-navy-100 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-600 transition hover:bg-navy-50"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
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

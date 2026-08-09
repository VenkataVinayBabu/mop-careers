import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute, { HOME_FOR_ROLE } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';

import AdminAccounts from './pages/admin/Accounts';
import AdminBatches from './pages/admin/Batches';
import AdminDashboard from './pages/admin/Dashboard';
import AdminEnquiries from './pages/admin/Enquiries';
import AdminFees from './pages/admin/Fees';
import AdminPlacements from './pages/admin/Placements';
import AdminWebsite from './pages/admin/Website';
import DoubtsInbox from './pages/staff/DoubtsInbox';
import Landing from './pages/public/Landing';
import ProgramDetail from './pages/public/ProgramDetail';

import BatchWorkspace from './pages/teacher/BatchWorkspace';
import TeacherBatches from './pages/teacher/Batches';

import StudentApplications from './pages/student/Applications';
import StudentCurriculum from './pages/student/Curriculum';
import StudentDoubts from './pages/student/Doubts';
import StudentHome from './pages/student/Home';
import StudentMissed from './pages/student/Missed';
import ProfileSettings from './pages/student/ProfileSettings';
import StudentProgress from './pages/student/Progress';
import StudentSchedule from './pages/student/Schedule';

/** The public landing page, unless you are already signed in — in which case
 *  you go straight to your dashboard.
 *
 *  `?preview` opts out of that redirect. Without it an admin cannot look at
 *  the site they have just edited: "View the site" on Admin > Website opened a
 *  tab that bounced straight back to /admin, so the one person who needs to
 *  check their own change was the one person who could not see it. The
 *  parameter has to be explicit — a signed-in student landing on / should
 *  still go to their dashboard rather than the marketing page. */
function PublicHome() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  if (loading) return null;
  if (user && !params.has('preview')) {
    return (
      <Navigate
        to={user.must_change_password ? '/change-password' : HOME_FOR_ROLE[user.role] || '/login'}
        replace
      />
    );
  }
  return <Landing />;
}

/*
 * Reset the scroll position when the route changes.
 *
 * React Router does not do this on its own: the browser keeps whatever offset
 * you were already at, so clicking a programme card halfway down the home page
 * opened its detail page halfway down too — landing you in the middle of a
 * section instead of at the top.
 *
 * Two deliberate exceptions:
 *  - a URL with a hash is asking to land at a section, so leave it alone and
 *    let the page's own hash effect do the scrolling;
 *  - only PUSH navigations reset. On back/forward the browser restores the
 *    position you left, which is exactly what someone pressing Back expects.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (hash) return;
    if (navigationType === 'POP') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash, navigationType]);

  return null;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-navy-200">404</p>
      <h1 className="mt-3 text-xl font-semibold text-navy">Page not found</h1>
      <p className="mt-1 text-sm text-navy-400">
        That page doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <a href="/" className="btn-cta mt-6">
        Go home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* Public marketing site — no auth. Signed-in users get sent to their
          own home so the landing page is not a dead end for them. */}
      <Route path="/" element={<PublicHome />} />
      {/* There is no separate programmes page — all of them live on the home
          page. Both former paths redirect to that section so nothing already
          linking here (a shared link, a bookmark, a search result) breaks. */}
      <Route path="/programs" element={<Navigate to={{ pathname: '/', hash: '#programs' }} replace />} />
      {/* Each program's own page. An unknown slug redirects to the list. */}
      <Route path="/programs/:slug" element={<ProgramDetail />} />
      <Route path="/courses" element={<Navigate to={{ pathname: '/', hash: '#programs' }} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />

      {/* Admin */}
      <Route
        element={
          <ProtectedRoute roles={['admin']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/batches" element={<AdminBatches />} />
        <Route path="/admin/accounts" element={<AdminAccounts />} />
        {/* Fees and placements are admin-only — the route guard above is the
            frontend half; the API enforces it independently. */}
        <Route path="/admin/fees" element={<AdminFees />} />
        <Route path="/admin/placements" element={<AdminPlacements />} />
        <Route path="/admin/enquiries" element={<AdminEnquiries />} />
        <Route path="/admin/doubts" element={<DoubtsInbox />} />
        {/* Content management for the public site. Admin-only on both sides —
            the API router carries its own admin dependency. */}
        <Route path="/admin/website" element={<AdminWebsite />} />
      </Route>

      {/* Teacher workspace — admins may open it too, since they can do everything. */}
      <Route
        element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/teacher" element={<TeacherBatches />} />
        <Route path="/teacher/batches/:batchId" element={<BatchWorkspace />} />
        <Route path="/teacher/doubts" element={<DoubtsInbox />} />
      </Route>

      {/* Student */}
      <Route
        element={
          <ProtectedRoute roles={['student']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/app" element={<StudentHome />} />
        <Route path="/app/curriculum" element={<StudentCurriculum />} />
        <Route path="/app/missed" element={<StudentMissed />} />
        <Route path="/app/schedule" element={<StudentSchedule />} />
        <Route path="/app/applications" element={<StudentApplications />} />
        <Route path="/app/doubts" element={<StudentDoubts />} />
        <Route path="/app/progress" element={<StudentProgress />} />
        {/* Reached from the sidebar profile menu, not the main nav. */}
        <Route path="/app/profile" element={<ProfileSettings />} />
      </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

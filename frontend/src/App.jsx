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
import AdminJobApplications from './pages/admin/JobApplications';
import AdminPlacements from './pages/admin/Placements';
import AdminWebsite from './pages/admin/Website';
import AdminWebsiteChanges from './pages/admin/WebsiteChanges';
import AdminWebsiteLeaders from './pages/admin/WebsiteLeaders';
import AdminWebsiteOpenings from './pages/admin/WebsiteOpenings';
import AdminWebsiteMentors from './pages/admin/WebsiteMentors';
import AdminWebsiteProgramEditor from './pages/admin/WebsiteProgramEditor';
import AdminWebsitePrograms from './pages/admin/WebsitePrograms';
import AdminWebsitePartners from './pages/admin/WebsitePartners';
import AdminWebsiteStatistics from './pages/admin/WebsiteStatistics';
import AdminWebsiteStories from './pages/admin/WebsiteStories';
import DoubtsInbox from './pages/staff/DoubtsInbox';
import Landing from './pages/public/Landing';
import ProgramDetail from './pages/public/ProgramDetail';

import BatchWorkspace from './pages/teacher/BatchWorkspace';
import TeacherBatches from './pages/teacher/Batches';

import ViewerBatchDetail from './pages/viewer/BatchDetail';
import ViewerBatches from './pages/viewer/Batches';
import ViewerFollowUps from './pages/viewer/FollowUps';

import StudentApplications from './pages/student/Applications';
import StudentCurriculum from './pages/student/Curriculum';
import StudentDoubts from './pages/student/Doubts';
import StudentHome from './pages/student/Home';
import StudentMissed from './pages/student/Missed';
import ProfileSettings from './pages/ProfileSettings';
import About from './pages/public/About';
import Careers from './pages/public/Careers';
import StaticPage from './pages/public/StaticPage';
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
      {/* Footer links. Stubs until MOP supplies the copy — see StaticPage. */}
      <Route path="/privacy-policy" element={<StaticPage slug="privacy-policy" />} />
      <Route path="/terms-of-service" element={<StaticPage slug="terms-of-service" />} />
      <Route path="/refund-policy" element={<StaticPage slug="refund-policy" />} />
      <Route path="/about" element={<About />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/courses" element={<Navigate to={{ pathname: '/', hash: '#programs' }} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />

      {/* Admin only. Fees sit here rather than in the back-office block below
          because a contributor must never see them; the API enforces that
          independently of this guard. */}
      <Route
        element={
          <ProtectedRoute roles={['admin', 'member']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/fees" element={<AdminFees />} />
        <Route path="/admin/enquiries" element={<AdminEnquiries />} />
      </Route>

      {/* The back office: admin, member and contributor. What each may
          actually do inside these screens differs, and the API is what decides
          — a contributor's website save becomes a proposal rather than a
          publish, and the stricter endpoints refuse them outright. */}
      <Route
        element={
          <ProtectedRoute roles={['admin', 'member', 'contributor']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/batches" element={<AdminBatches />} />
        <Route path="/admin/accounts" element={<AdminAccounts />} />
        <Route path="/admin/placements" element={<AdminPlacements />} />
        {/* Hiring, not admissions — which is why this sits here and enquiries
            do not. Deleting one is still member-and-above, in the API. */}
        <Route path="/admin/job-applications" element={<AdminJobApplications />} />
        <Route path="/admin/doubts" element={<DoubtsInbox />} />
        <Route path="/admin/website/approvals" element={<AdminWebsiteChanges />} />
        <Route path="/admin/website/my-changes" element={<AdminWebsiteChanges mine />} />
        {/* Content management for the public site. */}
        <Route path="/admin/website" element={<AdminWebsite />} />
        <Route path="/admin/website/leaders" element={<AdminWebsiteLeaders />} />
        <Route path="/admin/website/openings" element={<AdminWebsiteOpenings />} />
        <Route path="/admin/website/programs" element={<AdminWebsitePrograms />} />
        {/* One programme is a page, not a modal — it carries a whole syllabus. */}
        <Route path="/admin/website/programs/:programId" element={<AdminWebsiteProgramEditor />} />
        <Route path="/admin/website/statistics" element={<AdminWebsiteStatistics />} />
        <Route path="/admin/website/mentors" element={<AdminWebsiteMentors />} />
        <Route path="/admin/website/stories" element={<AdminWebsiteStories />} />
        <Route path="/admin/website/partners" element={<AdminWebsitePartners />} />
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

      {/* viewer - read-only across every batch. Admins may open it too, both
          because they can do everything and because it is the only way to see
          what a viewer sees without a second account. Every screen under here
          is read-only; the API enforces that independently. */}
      <Route
        element={
          <ProtectedRoute roles={['viewer', 'admin']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/watch" element={<ViewerFollowUps />} />
        <Route path="/watch/batches" element={<ViewerBatches />} />
        <Route path="/watch/batches/:batchId" element={<ViewerBatchDetail />} />
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
        {/* Where a student's profile used to live, kept so an old bookmark or
            a link in an email still lands somewhere. */}
        <Route path="/app/profile" element={<Navigate to="/profile" replace />} />
      </Route>

      {/* Editing your own details — every signed-in role, no role list. A
          teacher whose phone number changed had no screen at all before this,
          and a viewer rings that number when a recording is missing.
          Reached from the sidebar footer, not the main nav. */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<ProfileSettings />} />
      </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

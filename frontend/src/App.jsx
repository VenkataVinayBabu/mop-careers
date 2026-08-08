import { Navigate, Route, Routes } from 'react-router-dom';

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
import DoubtsInbox from './pages/staff/DoubtsInbox';
import Landing from './pages/public/Landing';

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
 *  you go straight to your dashboard. */
function PublicHome() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return (
      <Navigate
        to={user.must_change_password ? '/change-password' : HOME_FOR_ROLE[user.role] || '/login'}
        replace
      />
    );
  }
  return <Landing />;
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
    <Routes>
      {/* Public marketing site — no auth. Signed-in users get sent to their
          own home so the landing page is not a dead end for them. */}
      <Route path="/" element={<PublicHome />} />
      {/* There is no separate programmes page — all of them live on the home
          page. Both former paths redirect to that section so nothing already
          linking here (a shared link, a bookmark, a search result) breaks. */}
      <Route path="/programs" element={<Navigate to={{ pathname: '/', hash: '#programs' }} replace />} />
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
  );
}

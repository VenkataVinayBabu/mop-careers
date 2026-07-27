import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { ErrorState, Loading, PageHeader, StatCard } from '../../components/ui';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Admin dashboard" subtitle="Platform overview" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Batches" value={stats.batches} />
        <StatCard label="Students" value={stats.students} tone="teal" />
        <StatCard label="Teachers" value={stats.teachers} tone="teal" />
        <StatCard
          label="Blocked accounts"
          value={stats.blocked}
          tone={stats.blocked > 0 ? 'orange' : 'navy'}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <StatCard label="Classes completed" value={stats.classes_completed} />
        <StatCard label="Attendance records" value={stats.attendance_records} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/batches" className="card p-5 transition hover:shadow-lift">
          <h3 className="font-semibold text-navy">Batches</h3>
          <p className="mt-1 text-sm text-navy-400">
            Create batches, set dates and assign teachers.
          </p>
          <p className="mt-3 text-sm font-semibold text-teal">Manage batches &rarr;</p>
        </Link>
        <Link to="/admin/accounts" className="card p-5 transition hover:shadow-lift">
          <h3 className="font-semibold text-navy">Accounts</h3>
          <p className="mt-1 text-sm text-navy-400">
            Create teacher and student logins, block or unblock access.
          </p>
          <p className="mt-3 text-sm font-semibold text-teal">Manage accounts &rarr;</p>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link to="/admin/fees" className="card p-5 transition hover:shadow-lift">
          <h3 className="font-semibold text-navy">Fees</h3>
          <p className="mt-1 text-sm text-navy-400">
            Total fees, payments and outstanding balances. Never visible to students.
          </p>
          <p className="mt-3 text-sm font-semibold text-teal">Manage fees &rarr;</p>
        </Link>
        <Link to="/admin/placements" className="card p-5 transition hover:shadow-lift">
          <h3 className="font-semibold text-navy">Placements</h3>
          <p className="mt-1 text-sm text-navy-400">
            Companies, applications, interview rounds and batch-wise stats.
          </p>
          <p className="mt-3 text-sm font-semibold text-teal">Manage placements &rarr;</p>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link to="/admin/enquiries" className="card p-5 transition hover:shadow-lift">
          <h3 className="font-semibold text-navy">Enquiries</h3>
          <p className="mt-1 text-sm text-navy-400">
            Leads submitted through the public website, with a status workflow.
          </p>
          <p className="mt-3 text-sm font-semibold text-teal">View enquiries &rarr;</p>
        </Link>
        <Link to="/admin/doubts" className="card p-5 transition hover:shadow-lift">
          <h3 className="font-semibold text-navy">Doubt support</h3>
          <p className="mt-1 text-sm text-navy-400">
            Student queries routed by type, with open and answered tracking.
          </p>
          <p className="mt-3 text-sm font-semibold text-teal">Open inbox &rarr;</p>
        </Link>
      </div>

      <div className="mt-6 card p-5">
        <h3 className="font-semibold text-navy">Coming in later phases</h3>
        <ul className="mt-2 space-y-1 text-sm text-navy-400">
          <li>Phase 3 — ATS resume builder and scoring</li>
          <li>Phase 4 — AI interviewer</li>
        </ul>
      </div>
    </div>
  );
}

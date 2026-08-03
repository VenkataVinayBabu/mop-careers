import { useCallback, useEffect, useState } from 'react';
import {
  BookOpenCheck,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  Search,
  UserCheck,
} from 'lucide-react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { EmptyState, ErrorState, Loading, PageHeader, Spinner } from '../../components/ui';
import { formatDate } from '../../constants';

const iso = (d) => d.toISOString().slice(0, 10);

/** Default window: the last 90 days up to today. */
function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 90);
  return { from: iso(from), to: iso(to) };
}

function StatCardBlock({ icon: Icon, title, rows }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-navy-400">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
      </div>
      <dl className="mt-3 space-y-2 border-t border-navy-100 pt-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-navy-500">{r.label}</dt>
            <dd className={`text-sm font-semibold tabular-nums ${r.tone || 'text-navy'}`}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function StudentProgress() {
  const toast = useToast();
  const [range, setRange] = useState(defaultRange);
  const [applied, setApplied] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async (r) => {
    setError('');
    try {
      const { data: res } = await api.get('/student/progress', {
        params: { from: r.from, to: r.to },
      });
      setData(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(applied);
  }, [load, applied]);

  const search = (e) => {
    e.preventDefault();
    if (range.to < range.from) {
      toast.error('The end date must not be before the start date.');
      return;
    }
    setShowDetail(false);
    setApplied({ ...range });
  };

  if (loading) return <Loading label="Loading your progress…" />;
  if (error) return <ErrorState message={error} onRetry={() => load(applied)} />;

  return (
    <div>
      <PageHeader title="Progress report" subtitle="Track your progress over any period" />

      <form onSubmit={search} className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="from">From</label>
          <input
            id="from"
            type="date"
            className="input"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
        </div>
        <div className="flex-1">
          <label className="label" htmlFor="to">To</label>
          <input
            id="to"
            type="date"
            className="input"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-cta shrink-0">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </button>
      </form>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-navy">
          Progress report
          <span className="ml-2 font-normal text-navy-400">
            {formatDate(data.from_date)} &ndash; {formatDate(data.to_date)}
          </span>
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardBlock
            icon={CalendarCheck}
            title="Classes"
            rows={[
              { label: 'Present', value: data.classes_present, tone: 'text-teal' },
              {
                label: 'Absent',
                value: data.classes_absent,
                tone: data.classes_absent > 0 ? 'text-orange' : 'text-navy',
              },
              { label: 'Attendance', value: `${data.attendance_percent}%` },
            ]}
          />
          <StatCardBlock
            icon={BookOpenCheck}
            title="Curriculum"
            rows={[
              { label: 'Classes held', value: data.classes_held },
              { label: 'Topics covered', value: data.topics_covered, tone: 'text-teal' },
              { label: 'Course length', value: `${data.total_days} days` },
            ]}
          />
          <StatCardBlock
            icon={MessageSquareText}
            title="Doubts"
            rows={[
              { label: 'Raised', value: data.doubts_raised },
              { label: 'Answered', value: data.doubts_answered, tone: 'text-teal' },
              {
                label: 'Still open',
                value: data.doubts_open,
                tone: data.doubts_open > 0 ? 'text-orange' : 'text-navy',
              },
            ]}
          />
          <StatCardBlock
            icon={UserCheck}
            title="Interview rounds"
            rows={[
              { label: 'Scheduled', value: data.rounds_total },
              { label: 'Passed', value: data.rounds_passed, tone: 'text-teal' },
              {
                label: 'Failed',
                value: data.rounds_failed,
                tone: data.rounds_failed > 0 ? 'text-orange' : 'text-navy',
              },
              { label: 'Pending', value: data.rounds_pending },
            ]}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-navy-50 py-2.5 text-sm font-semibold text-navy-600 transition hover:bg-navy-100"
        >
          {showDetail ? (
            <>
              Hide detailed report
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              View detailed report
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>

        {showDetail && (
          <div className="mt-4 border-t border-navy-100 pt-4">
            {data.days.length === 0 ? (
              <EmptyState
                title="No classes in this period"
                message="Try widening the date range."
              />
            ) : (
              <div className="table-wrap">
                <table className="min-w-full divide-y divide-navy-100">
                  <thead className="bg-navy-50">
                    <tr>
                      <th className="th">Day</th>
                      <th className="th">Topic</th>
                      <th className="th">Date</th>
                      <th className="th">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {data.days.map((d) => (
                      <tr key={d.day_number}>
                        <td className="td font-semibold text-navy">Day {d.day_number}</td>
                        <td className="td">{d.topic}</td>
                        <td className="td text-navy-400">{formatDate(d.scheduled_date) || '—'}</td>
                        <td className="td">
                          <span className={d.present ? 'badge-done' : 'badge-warn'}>
                            {d.present ? 'Present' : 'Absent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

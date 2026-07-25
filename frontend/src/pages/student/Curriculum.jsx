import { useCallback, useEffect, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { formatDate } from '../../constants';
import { downloadNotes } from '../../utils/download';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Upcoming' },
];

function AttendancePill({ day }) {
  if (day.status !== 'completed') return <span className="badge-pending">Not held yet</span>;
  return day.present ? (
    <span className="badge-done">Present</span>
  ) : (
    <span className="badge-warn">Absent</span>
  );
}

export default function StudentCurriculum() {
  const toast = useToast();
  const [days, setDays] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/student/curriculum');
      setDays(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleNotes = async (day) => {
    setDownloading(day.id);
    try {
      await downloadNotes(day.id, day.day_number);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <Loading label="Loading your curriculum…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const visible = days.filter((d) => filter === 'all' || d.status === filter);
  const completed = days.filter((d) => d.status === 'completed').length;

  return (
    <div>
      <PageHeader
        title="Curriculum roadmap"
        subtitle={`${completed} of ${days.length} classes completed`}
      />

      <div className="mb-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              filter === f.key
                ? 'bg-navy text-white'
                : 'border border-navy-200 bg-white text-navy-600 hover:bg-navy-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No curriculum yet"
            message="You have not been assigned to a batch, so there is no curriculum to show."
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState title="Nothing here" message="No classes match this filter." />
        </div>
      ) : (
        <ol className="space-y-3">
          {visible.map((day) => (
            <li key={day.id} className="card p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex h-7 min-w-[3.25rem] items-center justify-center rounded-md px-2 text-xs font-bold ${
                        day.status === 'completed'
                          ? 'bg-teal text-white'
                          : 'bg-navy-100 text-navy-500'
                      }`}
                    >
                      Day {day.day_number}
                    </span>
                    <AttendancePill day={day} />
                    {day.scheduled_date && (
                      <span className="text-xs text-navy-400">{formatDate(day.scheduled_date)}</span>
                    )}
                  </div>

                  <h3 className="mt-2 font-semibold text-navy">{day.topic}</h3>
                  {day.description && (
                    <p className="mt-1 text-sm text-navy-400">{day.description}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {day.recording_url && (
                    <a
                      href={day.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-sm"
                    >
                      Watch recording
                    </a>
                  )}
                  {day.notes_file && (
                    <button
                      type="button"
                      onClick={() => handleNotes(day)}
                      disabled={downloading === day.id}
                      className="btn-ghost btn-sm"
                    >
                      {downloading === day.id ? 'Downloading…' : 'Notes PDF'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

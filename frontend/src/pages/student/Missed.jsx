import { useCallback, useEffect, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { formatDate } from '../../constants';
import { downloadNotes } from '../../utils/download';

export default function StudentMissed() {
  const toast = useToast();
  const [days, setDays] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/student/missed');
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

  if (loading) return <Loading label="Checking your attendance…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Missed classes"
        subtitle={
          days.length
            ? `${days.length} class${days.length === 1 ? '' : 'es'} to catch up on`
            : 'Nothing to catch up on'
        }
      />

      {days.length === 0 ? (
        <div className="card">
          <EmptyState
            title="You're all caught up"
            message="You have attended every class held so far. Excellent work."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {days.map((day) => (
            <li key={day.id} className="card border-l-4 border-l-orange p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-warn">Day {day.day_number}</span>
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
                  {day.recording_url ? (
                    <a
                      href={day.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-cta btn-sm"
                    >
                      Watch recording
                    </a>
                  ) : (
                    <span className="badge-pending">Recording not uploaded</span>
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
        </ul>
      )}
    </div>
  );
}

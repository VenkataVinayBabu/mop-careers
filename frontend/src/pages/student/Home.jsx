import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import {
  ErrorState,
  Loading,
  PageHeader,
  ProgressBar,
  Spinner,
  StatCard,
} from '../../components/ui';
import { MILESTONE_STEPS, formatDate } from '../../constants';

function RoadmapBanner({ milestones }) {
  const reached = MILESTONE_STEPS.filter((s) => milestones?.[s.key]);
  const current = reached.length ? reached[reached.length - 1] : null;
  const next = MILESTONE_STEPS.find((s) => !milestones?.[s.key]);

  return (
    <div className="mb-6 overflow-hidden rounded-xl bg-navy text-white shadow-card">
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-200">
            Your roadmap
          </p>
          <p className="text-xs text-navy-300">
            {reached.length} of {MILESTONE_STEPS.length} milestones
          </p>
        </div>

        <h2 className="mt-1.5 text-xl font-bold">
          {current ? current.label : 'Getting started'}
          {current && milestones[current.key] && (
            <span className="ml-2 text-sm font-normal text-navy-300">
              {formatDate(milestones[current.key])}
            </span>
          )}
        </h2>
        {next && <p className="mt-1 text-sm text-navy-200">Up next: {next.label}</p>}

        {/* Horizontal scroll keeps all 8 steps reachable on a phone. */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {MILESTONE_STEPS.map((step) => {
            const done = Boolean(milestones?.[step.key]);
            return (
              <div
                key={step.key}
                className={`flex min-w-[7.5rem] shrink-0 flex-col gap-1 rounded-lg border px-3 py-2 ${
                  done ? 'border-teal bg-teal/15' : 'border-navy-600 bg-navy-600/40'
                }`}
              >
                <span className={`text-xs font-semibold ${done ? 'text-teal-100' : 'text-navy-300'}`}>
                  {done ? '✓ ' : ''}
                  {step.label}
                </span>
                <span className="text-[11px] text-navy-300">
                  {done ? formatDate(milestones[step.key]) : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NextClassCard({ day }) {
  if (!day) {
    return (
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Next class</p>
        <p className="mt-2 text-sm text-navy-400">
          No upcoming class scheduled yet. Your instructor will publish dates soon.
        </p>
      </div>
    );
  }
  return (
    <div className="card border-l-4 border-l-orange p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Next class</p>
        <span className="badge-warn">Day {day.day_number}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold text-navy">{day.topic}</h3>
      {day.description && <p className="mt-1 text-sm text-navy-400">{day.description}</p>}
      <p className="mt-3 text-sm font-medium text-teal">
        {day.scheduled_date ? formatDate(day.scheduled_date) : 'Date to be announced'}
      </p>
    </div>
  );
}

export default function StudentHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/student/dashboard');
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const firstName = data.student_name?.split(' ')[0] || 'there';

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={data.batch_name ? `Batch ${data.batch_name}` : 'No batch assigned yet'}
      />

      <RoadmapBanner milestones={data.milestones} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Classes attended"
          value={data.classes_attended}
          suffix={`/ ${data.total_days}`}
          hint={`${data.classes_held} held so far`}
        />
        <StatCard
          label="Attendance"
          value={data.attendance_percent}
          suffix="%"
          tone={data.attendance_percent >= 75 ? 'teal' : 'orange'}
          hint={data.attendance_percent >= 75 ? 'On track' : 'Needs attention'}
        />
        <StatCard label="Mock interviews" value={data.mocks_taken} hint="Available in Phase 4" />
        <StatCard
          label="Resume score"
          value={data.latest_resume_score ?? '—'}
          tone="teal"
          hint="Available in Phase 3"
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <NextClassCard day={data.next_class} />

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            Course progress
          </p>
          <p className="mt-2 text-3xl font-bold text-navy">
            {data.classes_held}
            <span className="ml-1 text-lg font-semibold text-navy-300">/ {data.total_days} days</span>
          </p>
          <div className="mt-3">
            <ProgressBar value={data.classes_held} max={data.total_days} />
          </div>
          {data.missed_count > 0 ? (
            <Link
              to="/app/missed"
              className="mt-4 inline-flex text-sm font-semibold text-orange hover:text-orange-600"
            >
              You missed {data.missed_count} class{data.missed_count === 1 ? '' : 'es'} — catch up &rarr;
            </Link>
          ) : (
            <p className="mt-4 text-sm font-medium text-teal">
              Perfect attendance so far. Keep it up.
            </p>
          )}
        </div>
      </div>

      <CertificateCard />
    </div>
  );
}

/** Locked until the course_completed milestone is stamped. The API enforces
 *  that independently — this is just the presentation of it. */
function CertificateCard() {
  const toast = useToast();
  const [cert, setCert] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/student/certificate')
      .then(({ data }) => {
        if (!cancelled) setCert(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const download = async () => {
    setDownloading(true);
    try {
      const { data } = await api.get('/student/certificate/download', {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MOP_Certificate.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  if (!cert) return null;

  if (!cert.unlocked) {
    return (
      <div className="card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-400">
              &#128274;
            </div>
            <div>
              <p className="text-sm font-semibold text-navy">Course certificate</p>
              <p className="mt-0.5 text-sm text-navy-400">
                Unlocks when all 55 days are complete.
              </p>
            </div>
          </div>
          <span className="badge-pending shrink-0">Locked</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-l-4 border-l-teal p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-done">Unlocked</span>
            <span className="text-xs text-navy-400">
              Completed {formatDate(cert.completed_on)}
            </span>
          </div>
          <p className="mt-2 font-semibold text-navy">Your course certificate is ready</p>
          <p className="mt-0.5 text-sm text-navy-400">
            {cert.course_name}
            {cert.batch_name ? ` · Batch ${cert.batch_name}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={download} disabled={downloading} className="btn-cta">
            {downloading && <Spinner className="h-4 w-4" />}
            {downloading ? 'Preparing…' : 'Download certificate'}
          </button>
          {cert.linkedin_url && (
            <a
              href={cert.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Share on LinkedIn
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

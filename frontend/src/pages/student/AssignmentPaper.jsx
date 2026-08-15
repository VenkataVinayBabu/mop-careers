import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { ErrorState, Loading, PageHeader, Spinner } from '../../components/ui';
import { formatDate } from '../../constants';

/*
 * Sitting an assignment, and everything that follows it.
 *
 * One screen with three states — the paper, the marked result, and the
 * leaderboard — because they are the same thing at three moments and splitting
 * them across routes would mean a student who just submitted losing their place.
 *
 * The correct answers do not exist in this component until after submission:
 * the API does not send them with the paper, so there is nothing here to hide.
 */

function Leaderboard({ assignmentId }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/student/assignments/${assignmentId}/leaderboard`)
      .then(({ data }) => !cancelled && setRows(data))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  if (error) return <p className="text-sm text-navy-400">{error}</p>;
  if (rows === null) return <p className="text-sm text-navy-400">Loading the leaderboard…</p>;

  return (
    <ol className="divide-y divide-navy-100">
      {rows.map((r) => (
        <li
          key={`${r.rank}-${r.name}`}
          className={`flex items-center gap-4 py-3 ${r.is_me ? 'font-semibold text-navy' : 'text-navy-600'}`}
        >
          {/* The top three get the emphasis; everyone else gets a plain number. */}
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              r.rank === 1
                ? 'bg-orange text-white'
                : r.rank <= 3
                  ? 'bg-teal text-white'
                  : 'bg-navy-50 text-navy-500'
            }`}
          >
            {r.rank}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {r.name}
            {r.is_me && <span className="ml-2 text-xs font-semibold text-teal-ink">you</span>}
          </span>
          <span className="shrink-0 tabular-nums">
            {r.score}/{r.total}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function AssignmentPaper() {
  const { assignmentId } = useParams();
  const toast = useToast();

  const [paper, setPaper] = useState(null);
  const [result, setResult] = useState(null);
  const [chosen, setChosen] = useState({});     // question index -> option index
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/student/assignments/${assignmentId}`);
      setPaper(data);
      if (data.submitted) {
        const { data: r } = await api.get(`/student/assignments/${assignmentId}/result`);
        setResult(r);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const unanswered = paper.questions.length - Object.keys(chosen).length;
    if (unanswered > 0) {
      /* Warned rather than blocked — a skipped question is a valid choice, and
         there is only one attempt, so the count is worth saying out loud. */
      const ok = window.confirm(
        `${unanswered} question${unanswered === 1 ? '' : 's'} still unanswered. ` +
        'You only get one attempt. Submit anyway?',
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const answers = paper.questions.map((_, i) => (i in chosen ? chosen[i] : -1));
      const { data } = await api.post(`/student/assignments/${assignmentId}/submit`, { answers });
      setResult(data);
      setPaper({ ...paper, submitted: true, score: data.score, total: data.total });
      toast.success(`Submitted — you scored ${data.score} out of ${data.total}.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading assignment…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const percent = result && result.total ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title={paper.title}
        subtitle={`Day ${paper.day_number} · ${paper.day_topic}${
          paper.due_on ? ` · due ${formatDate(paper.due_on)}` : ''
        }`}
        action={
          <Link to="/app/assignments" className="btn-ghost btn-sm">
            All assignments
          </Link>
        }
      />

      {paper.instructions && !result && (
        <p className="mb-6 rounded-xl border border-navy-100 bg-white p-5 text-sm text-navy-600">
          {paper.instructions}
        </p>
      )}

      {result ? (
        <>
          <div className="card mb-6 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Your score</p>
            <p className="mt-2 text-5xl font-bold text-navy">
              {result.score}
              <span className="text-2xl font-semibold text-navy-300">/{result.total}</span>
            </p>
            <p className={`mt-1 font-semibold ${percent >= 60 ? 'text-teal' : 'text-orange'}`}>
              {percent}%
            </p>
          </div>

          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
            The answers
          </h2>
          <ol className="mb-8 space-y-4">
            {result.review.map((r, i) => {
              const right = r.chosen === r.correct;
              return (
                <li key={r.question} className="card p-5">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        right ? 'bg-teal' : 'bg-orange'
                      }`}
                    >
                      {right ? '✓' : '✕'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-navy">
                        {i + 1}. {r.question}
                      </p>
                      <ul className="mt-3 grid gap-1.5">
                        {r.options.map((opt, oi) => (
                          <li
                            key={opt}
                            className={`rounded-lg px-3 py-2 text-sm ${
                              oi === r.correct
                                ? 'bg-teal-50 font-medium text-teal-ink'
                                : oi === r.chosen
                                  ? 'bg-orange-50 text-orange-700'
                                  : 'text-navy-500'
                            }`}
                          >
                            {opt}
                            {oi === r.correct && (
                              <span className="ml-2 text-xs font-semibold">correct answer</span>
                            )}
                            {oi === r.chosen && oi !== r.correct && (
                              <span className="ml-2 text-xs font-semibold">you chose this</span>
                            )}
                          </li>
                        ))}
                      </ul>
                      {r.chosen === -1 && (
                        <p className="mt-2 text-xs font-medium text-orange">Not answered</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="card p-5">
            <h2 className="mb-1 font-semibold text-navy">Batch leaderboard</h2>
            <p className="mb-3 text-xs text-navy-400">
              How your batch did on this assignment. Everyone here has submitted it.
            </p>
            <Leaderboard assignmentId={assignmentId} />
          </div>
        </>
      ) : (
        <>
          <ol className="space-y-4">
            {paper.questions.map((q, i) => (
              <li key={q.question} className="card p-5">
                <p className="font-medium text-navy">
                  {i + 1}. {q.question}
                </p>
                <ul className="mt-3 grid gap-2">
                  {q.options.map((opt, oi) => (
                    <li key={opt}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition ${
                          chosen[i] === oi
                            ? 'border-teal bg-teal-50 font-medium text-teal-ink'
                            : 'border-navy-100 text-navy-600 hover:bg-navy-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${i}`}
                          checked={chosen[i] === oi}
                          onChange={() => setChosen({ ...chosen, [i]: oi })}
                          className="h-4 w-4 border-navy-300 text-teal focus:ring-teal"
                        />
                        {opt}
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="button" onClick={submit} disabled={saving} className="btn-cta">
              {saving && <Spinner className="h-4 w-4" />}
              {saving ? 'Submitting…' : 'Submit assignment'}
            </button>
            <p className="text-sm text-navy-400">
              {Object.keys(chosen).length} of {paper.questions.length} answered · one attempt only
            </p>
          </div>
        </>
      )}
    </div>
  );
}

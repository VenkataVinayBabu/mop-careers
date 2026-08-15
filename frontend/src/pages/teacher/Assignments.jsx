import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { EmptyState, ErrorState, Loading, Modal, PageHeader, Spinner } from '../../components/ui';
import { formatDate } from '../../constants';

/*
 * Admin/Teacher > a batch > Assignments.
 *
 * One screen per batch rather than a panel inside each class day: a teacher
 * setting work thinks "what have I set and who has done it", which is a list
 * across the batch, not something buried one day at a time.
 *
 * Questions cannot be edited once anybody has submitted — the API refuses it,
 * and this screen says so before you try rather than letting you type out a
 * rewrite and lose it to a 409.
 */

const BLANK_QUESTION = { question: '', options: ['', ''], answer: 0 };
const BLANK = { title: '', instructions: '', questions: [{ ...BLANK_QUESTION, options: ['', ''] }], published: false, due_on: '' };

function QuestionEditor({ index, value, onChange, onRemove, canRemove }) {
  const setOption = (oi, text) => {
    const options = [...value.options];
    options[oi] = text;
    onChange({ ...value, options });
  };

  const addOption = () => onChange({ ...value, options: [...value.options, ''] });

  const removeOption = (oi) => {
    const options = value.options.filter((_, i) => i !== oi);
    // The correct answer moves with the options, or it would silently start
    // pointing at a different one.
    let answer = value.answer;
    if (oi === answer) answer = 0;
    else if (oi < answer) answer -= 1;
    onChange({ ...value, options, answer });
  };

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">
          Question {index + 1}
        </span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-orange">
            Remove
          </button>
        )}
      </div>

      <input
        className="input mt-2"
        placeholder="What does len() return?"
        value={value.question}
        onChange={(e) => onChange({ ...value, question: e.target.value })}
      />

      <p className="mt-3 text-xs text-navy-400">
        Tick the correct answer. Between 2 and 6 options.
      </p>
      <ul className="mt-2 grid gap-2">
        {value.options.map((opt, oi) => (
          <li key={oi} className="flex items-center gap-2.5">
            <input
              type="radio"
              name={`correct-${index}`}
              checked={value.answer === oi}
              onChange={() => onChange({ ...value, answer: oi })}
              className="h-4 w-4 shrink-0 border-navy-300 text-teal focus:ring-teal"
              aria-label={`Option ${oi + 1} is correct`}
            />
            <input
              className="input"
              placeholder={`Option ${oi + 1}`}
              value={opt}
              onChange={(e) => setOption(oi, e.target.value)}
            />
            {value.options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(oi)}
                className="shrink-0 px-1 text-navy-300 hover:text-orange"
                aria-label={`Remove option ${oi + 1}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      {value.options.length < 6 && (
        <button type="button" onClick={addOption} className="btn-ghost btn-sm mt-2">
          Add option
        </button>
      )}
    </div>
  );
}

export default function TeacherAssignments() {
  const { batchId } = useParams();
  const toast = useToast();

  const [days, setDays] = useState([]);
  const [rows, setRows] = useState([]);
  const [batch, setBatch] = useState(null);
  const [editing, setEditing] = useState(null);   // {dayId, existing}
  const [draft, setDraft] = useState(BLANK);
  const [results, setResults] = useState(null);   // {assignment, rows}
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, a, b] = await Promise.all([
        api.get(`/teacher/batches/${batchId}/days`),
        api.get(`/teacher/batches/${batchId}/assignments`),
        api.get('/teacher/batches'),
      ]);
      setDays(d.data);
      setRows(a.data);
      setBatch(b.data.find((x) => String(x.id) === String(batchId)) || null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  const dayById = useMemo(() => Object.fromEntries(days.map((d) => [d.id, d])), [days]);

  const openNew = () => {
    if (!days.length) return;
    setEditing({ dayId: days[0].id, existing: null });
    setDraft({ ...BLANK, questions: [{ question: '', options: ['', ''], answer: 0 }] });
  };

  const openEdit = async (row) => {
    try {
      const { data } = await api.get(`/teacher/days/${row.day_id}/assignments`);
      const full = data.find((x) => x.id === row.assignment_id);
      setEditing({ dayId: row.day_id, existing: full, locked: row.submitted_count > 0 });
      setDraft({
        title: full.title,
        instructions: full.instructions || '',
        questions: full.questions,
        published: full.published,
        due_on: full.due_on || '',
      });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        title: draft.title,
        instructions: draft.instructions,
        published: draft.published,
        due_on: draft.due_on || null,
      };
      if (editing.existing) {
        // Questions are only sent when they can still be changed — sending them
        // unchanged would still trip the API's guard once somebody has answered.
        if (!editing.locked) body.questions = draft.questions;
        await api.patch(`/teacher/assignments/${editing.existing.id}`, body);
        toast.success('Assignment updated.');
      } else {
        await api.post(`/teacher/days/${editing.dayId}/assignments`, {
          ...body,
          questions: draft.questions,
        });
        toast.success('Assignment created.');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (row) => {
    try {
      await api.patch(`/teacher/assignments/${row.assignment_id}`, { published: !row.published });
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.title}"? Any submissions go with it.`)) return;
    try {
      await api.delete(`/teacher/assignments/${row.assignment_id}`);
      toast.info('Assignment deleted.');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const openResults = async (row) => {
    try {
      const { data } = await api.get(`/teacher/assignments/${row.assignment_id}/results`);
      setResults({ row, rows: data });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <Loading label="Loading assignments…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  /* The API returns day_number but the edit path needs the day id, so it is
     matched back here rather than widening the response. */
  const withDayId = rows.map((r) => ({
    ...r,
    day_id: days.find((d) => d.day_number === r.day_number)?.id,
  }));

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle={batch ? `${batch.name} · ${batch.student_count} students` : ''}
        action={
          <div className="flex gap-2">
            <Link to={`/teacher/batches/${batchId}`} className="btn-ghost btn-sm">
              Back to batch
            </Link>
            <button type="button" onClick={openNew} className="btn-cta" disabled={!days.length}>
              Set an assignment
            </button>
          </div>
        }
      />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Nothing set yet"
            message="Assignments are multiple choice and marked automatically. Students see them once you publish."
            action={
              <button type="button" onClick={openNew} className="btn-cta" disabled={!days.length}>
                Set an assignment
              </button>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {withDayId.map((r) => {
            const pct = r.student_count ? Math.round((r.submitted_count / r.student_count) * 100) : 0;
            return (
              <li key={r.assignment_id} className={`card p-5 ${r.published ? '' : 'opacity-70'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-ink">
                      Day {r.day_number}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-navy">{r.title}</h3>
                      {!r.published && (
                        <span className="badge bg-navy-100 text-navy-600">Not published</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-navy-400">
                      {r.submitted_count} of {r.student_count} submitted
                      {r.average_score !== null && ` · batch average ${r.average_score}%`}
                      {r.due_on && ` · due ${formatDate(r.due_on)}`}
                    </p>
                    <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-navy-100">
                      <div
                        className={`h-full rounded-full ${pct === 100 ? 'bg-teal' : 'bg-orange'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <button type="button" onClick={() => openResults(r)} className="btn-ghost btn-sm">
                      Results
                    </button>
                    <button type="button" onClick={() => togglePublished(r)} className="btn-ghost btn-sm">
                      {r.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button type="button" onClick={() => openEdit(r)} className="btn-ghost btn-sm">
                      Edit
                    </button>
                    <button type="button" onClick={() => remove(r)} className="btn-ghost btn-sm text-orange">
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* --- the editor --- */}
      <Modal
        open={editing !== null}
        title={editing?.existing ? `Edit ${editing.existing.title}` : 'Set an assignment'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving} className="btn-cta">
              {saving && <Spinner className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4">
            {editing.locked && (
              <p className="rounded-lg bg-orange-50 p-3.5 text-xs text-orange-700">
                {editing.existing.submitted_count} student(s) have already submitted this, so the
                questions can no longer be changed — their marks refer to them. The title, due date
                and whether it is published can still be edited.
              </p>
            )}

            {!editing.existing && (
              <div>
                <label className="label" htmlFor="a-day">Class day</label>
                <select
                  id="a-day"
                  className="input"
                  value={editing.dayId}
                  onChange={(e) => setEditing({ ...editing, dayId: Number(e.target.value) })}
                >
                  {days.map((d) => (
                    <option key={d.id} value={d.id}>
                      Day {d.day_number} — {d.topic}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label" htmlFor="a-title">Title</label>
              <input
                id="a-title"
                className="input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="a-instructions">Instructions</label>
              <textarea
                id="a-instructions"
                rows={2}
                className="input"
                placeholder="Optional — anything the student should know before starting."
                value={draft.instructions}
                onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="a-due">Due date</label>
              <input
                id="a-due"
                type="date"
                className="input"
                value={draft.due_on}
                onChange={(e) => setDraft({ ...draft, due_on: e.target.value })}
              />
            </div>

            {!editing.locked && (
              <div className="grid gap-3">
                {draft.questions.map((q, i) => (
                  <QuestionEditor
                    key={i}
                    index={i}
                    value={q}
                    canRemove={draft.questions.length > 1}
                    onChange={(next) => {
                      const questions = [...draft.questions];
                      questions[i] = next;
                      setDraft({ ...draft, questions });
                    }}
                    onRemove={() =>
                      setDraft({
                        ...draft,
                        questions: draft.questions.filter((_, x) => x !== i),
                      })
                    }
                  />
                ))}
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      questions: [...draft.questions, { question: '', options: ['', ''], answer: 0 }],
                    })
                  }
                >
                  Add question
                </button>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-navy-50 p-4 text-sm font-medium text-navy-700">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-navy-300 text-teal focus:ring-teal"
              />
              <span>
                Publish to students
                <span className="block text-xs text-navy-400">
                  Leave unticked to write it now and release it later. Students see nothing until
                  this is on.
                </span>
              </span>
            </label>
          </div>
        )}
      </Modal>

      {/* --- who has done it --- */}
      <Modal
        open={results !== null}
        title={results ? `Results — ${results.row.title}` : ''}
        onClose={() => setResults(null)}
        footer={
          <button type="button" className="btn-ghost" onClick={() => setResults(null)}>
            Close
          </button>
        }
      >
        {results && (
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-navy-100">
              <thead className="bg-navy-50">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Score</th>
                  <th className="th">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {results.rows.map((r) => (
                  <tr key={r.student_id}>
                    <td className="td font-medium text-navy">{r.name}</td>
                    <td className="td">
                      {r.submitted ? (
                        <span className={r.percent >= 60 ? 'text-teal' : 'text-orange'}>
                          {r.score}/{r.total} · {r.percent}%
                        </span>
                      ) : (
                        <span className="text-navy-300">—</span>
                      )}
                    </td>
                    <td className="td">
                      {r.submitted ? (
                        <span className="badge-done">Done</span>
                      ) : (
                        <span className="badge-warn">Not yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}

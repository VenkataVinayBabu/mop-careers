/*
 * The two input shapes the programme editor needs over and over.
 *
 * A programme page is mostly lists: skills, highlights, technologies, topics,
 * exit companies, plus repeating blocks for why/roles/syllabus/projects/FAQ.
 * Written out per field that would be well over a thousand lines of near
 * identical JSX, so the two patterns live here.
 */
import { useState } from 'react';

/**
 * A list of short strings entered one at a time — skills, topics, technologies.
 *
 * Enter adds, Backspace on an empty box removes the last one, and each chip has
 * its own remove button. A comma also commits, because people paste comma
 * separated lists and expect that to work rather than producing one long tag.
 */
export function TagList({ id, label, hint, value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const commit = (raw) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    // Case-insensitive dedupe: "Python" and "python" in one list is a typo,
    // not two skills.
    const seen = new Set(value.map((v) => v.toLowerCase()));
    const added = parts.filter((p) => !seen.has(p.toLowerCase()));
    if (added.length) onChange([...value, ...added]);
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      // Enter inside a form would submit the whole programme.
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <div className="rounded-lg border border-navy-200 bg-white p-2 focus-within:border-teal focus-within:ring-1 focus-within:ring-teal">
        {value.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {value.map((tag, i) => (
              <li key={`${tag}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 py-1 pl-3 pr-1.5 text-xs font-medium text-navy-700">
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={`Remove ${tag}`}
                  className="grid h-4 w-4 place-items-center rounded-full text-navy-400 transition hover:bg-navy-200 hover:text-navy"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          id={id}
          type="text"
          value={draft}
          placeholder={placeholder || 'Type and press Enter'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          /* Committing on blur too, or anything typed and not confirmed with
             Enter is silently thrown away when the programme is saved. */
          onBlur={() => commit(draft)}
          className="w-full border-0 bg-transparent px-1.5 py-1 text-sm text-navy-800 placeholder:text-navy-300 focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-navy-400">{hint}</p>}
    </div>
  );
}

/**
 * A repeating block — why cards, roles, syllabus phases, projects, FAQ rows.
 *
 * `renderItem(item, index, patch)` draws one entry's fields; `patch` takes a
 * partial object and merges it, so a caller never rebuilds the array itself.
 * Add/remove/reorder are handled here.
 */
export function Repeater({ label, hint, items = [], onChange, blank, renderItem, addLabel, itemLabel }) {
  const patchAt = (index) => (changes) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (index) => {
    /* No confirmation: this is unsaved form state, and Discard on the editor
       puts the whole programme back. Confirming every row of a long form is
       its own kind of hostile. */
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-4">
        <div>
          <span className="label mb-0">{label}</span>
          {hint && <p className="mt-0.5 text-xs text-navy-400">{hint}</p>}
        </div>
        <span className="shrink-0 text-xs text-navy-400">
          {items.length} {items.length === 1 ? itemLabel : `${itemLabel}s`}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-navy-100 bg-navy-50/40 p-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                {itemLabel} {i + 1}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                        aria-label={`Move ${itemLabel} ${i + 1} up`}
                        className="rounded p-1 text-navy-400 hover:bg-navy-100 hover:text-navy disabled:opacity-30 disabled:hover:bg-transparent">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m18 15-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}
                        aria-label={`Move ${itemLabel} ${i + 1} down`}
                        className="rounded p-1 text-navy-400 hover:bg-navy-100 hover:text-navy disabled:opacity-30 disabled:hover:bg-transparent">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button type="button" onClick={() => remove(i)}
                        aria-label={`Remove ${itemLabel} ${i + 1}`}
                        className="rounded px-2 py-1 text-xs font-semibold text-orange transition hover:bg-orange-50">
                  Remove
                </button>
              </div>
            </div>
            {renderItem(item, i, patchAt(i))}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...items, { ...blank }])}
        className="btn-ghost btn-sm mt-3"
      >
        + {addLabel}
      </button>
    </div>
  );
}

/** A plain labelled text input or textarea, with its inline error slot. */
export function Field({ id, label, hint, error, value, onChange, rows, max, placeholder }) {
  const Tag = rows ? 'textarea' : 'input';
  return (
    <div>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <Tag
        id={id}
        {...(rows ? { rows } : { type: 'text' })}
        maxLength={max}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={`input ${error ? 'border-orange focus:border-orange focus:ring-orange' : ''}`}
      />
      <div className="mt-1.5 flex items-start justify-between gap-4">
        <p className={`text-xs ${error ? 'font-medium text-orange-ink' : 'text-navy-400'}`}>
          {error || hint || ''}
        </p>
        {max && (
          <span className="shrink-0 text-xs tabular-nums text-navy-400">
            {(value ?? '').length}/{max}
          </span>
        )}
      </div>
    </div>
  );
}

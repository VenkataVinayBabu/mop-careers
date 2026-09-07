/*
 * A field only a bot will fill.
 *
 * WHY IT IS NOT `display: none`. That is the first thing a scraper checks, and
 * the well-built ones skip hidden inputs — leaving a trap that catches only the
 * bots that were never a problem. This is a real, rendered, focusable-looking
 * text input that is simply positioned off the visible page, which is the
 * version bots do fill.
 *
 * The three attributes matter as much as the CSS:
 *
 *   tabIndex={-1}       keyboard users never land on it
 *   aria-hidden         screen readers never announce it
 *   autoComplete="off"  a password manager never helpfully fills it and turns
 *                       a real applicant into a discarded submission
 *
 * `name` is what a bot's heuristics read, so it must look like something worth
 * filling. Called anything honest — `honeypot`, `bot-trap` — it would be
 * skipped by exactly the software it is meant to catch.
 *
 * The server decides what to do with it (app/routers/public.py). Nothing here
 * validates or blocks; the page must never behave differently because this
 * field is set, or a bot learns the check exists by watching the UI.
 */
export default function Honeypot({ value, onChange }) {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="company_website">Company website</label>
      <input
        id="company_website"
        name="company_website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

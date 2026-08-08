import { Link } from 'react-router-dom';

/*
 * One program card, shared by the landing page and the program pages.
 *
 * `featured` cards carry a tint and larger type; they are the two programs MOP
 * leads with. The index numeral is set in the accent serif — decorative, so it
 * is hidden from assistive tech rather than read out as stray content.
 */

/* A link where there is somewhere to go, a button where the action is only
   scrolling this page. Same look either way. */
function Action({ href, onOpen, children, ...rest }) {
  if (href) return <Link to={href} {...rest}>{children}</Link>;
  return <button type="button" onClick={onOpen} {...rest}>{children}</button>;
}

const TINTS = {
  0: 'bg-orange-50 border-orange-200',
  1: 'bg-teal-50 border-teal-200',
};

export default function ProgramCard({
  program,
  index,
  featured = false,
  // `href` makes the card action a real link — right-clickable, openable in a
  // new tab, and crawlable. `onOpen` remains for the scroll-to-section case.
  href,
  onOpen,
  actionLabel = 'Program details',
  // The two lead programs carry a written link; the rest are arrow-only, so the
  // eye lands on the two MOP wants to sell. Defaults to whether the card is
  // featured, but the programs page overrides it — there, every card is the
  // point of the page and deserves a named action.
  showActionLabel = featured,
}) {
  const tint = featured ? TINTS[index % 2] : '';

  return (
    <article className={`pcard relative ${tint}`}>
      <span
        aria-hidden="true"
        className="ser pointer-events-none absolute right-6 top-4 text-[2.1rem] leading-none text-navy-200"
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="flex flex-wrap items-center gap-2 pr-12">
        {program.badge && (
          <span
            className={`rounded-full px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-white ${
              program.badge === 'New' ? 'bg-teal' : 'bg-navy'
            }`}
          >
            {program.badge}
          </span>
        )}
        <span className="rounded-full bg-navy/5 px-3 py-1 text-[0.72rem] font-medium text-navy-500">
          {program.duration}
        </span>
      </div>

      <p className="mt-4 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-orange-ink">
        {program.ctcAvg}
        {program.ctcHigh ? ` · ${program.ctcHigh}` : ''}
      </p>

      <h3
        className={`mt-2 font-extrabold tracking-tight text-navy ${
          featured ? 'text-[1.45rem] leading-tight' : 'text-[1.05rem] leading-snug'
        }`}
      >
        {program.name}
      </h3>

      {/* Reserve three lines on the grid cards. Copy is written to fill three
          at desktop width, but the count shifts with viewport and font size —
          the floor keeps every card's pills row on the same line regardless,
          so a short description can never leave one card looking clipped. */}
      <p
        className={`mt-2.5 text-[0.89rem] text-navy-500 ${
          featured ? '' : 'sm:min-h-[4.3rem]'
        }`}
      >
        {program.summary}
      </p>

      {/* On arrow-only cards the arrow rides in the skills row rather than
          being pinned to the card's foot. Cards in a grid stretch to a common
          height, so a pinned footer left a hole between the pills and the
          arrow on every short card. */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {program.skills.map((s) => (
          <span
            key={s}
            className="rounded-full bg-navy/[0.04] px-2.5 py-1 text-[0.72rem] text-navy-500"
          >
            {s}
          </span>
        ))}

        {!showActionLabel && (
          /* With no label the arrow IS the control, so it carries the program
             name — otherwise this is six identical unlabelled arrows to anyone
             using a keyboard or a screen reader. */
          <Action
            href={href}
            onOpen={onOpen}
            aria-label={`${actionLabel}: ${program.name}`}
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border border-navy-100 bg-white text-navy transition hover:border-navy hover:bg-navy hover:text-white"
          >
            <span aria-hidden="true">&rarr;</span>
          </Action>
        )}
      </div>

      {showActionLabel && (
        /* Label and arrow are ONE button, so the arrow is clickable too — as a
           separate element it either did nothing on hover, or became a second
           tab stop doing the same job. The whole row is the target. */
        <Action
          href={href}
          onOpen={onOpen}
          className="group/action mt-auto flex w-full items-center justify-between gap-4 pt-6 text-left"
        >
          <span className="text-[0.84rem] font-semibold text-teal-ink transition group-hover/action:text-teal-700">
            {actionLabel}
          </span>
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-navy-100 bg-white text-navy transition group-hover/action:border-navy group-hover/action:bg-navy group-hover/action:text-white"
          >
            &rarr;
          </span>
        </Action>
      )}
    </article>
  );
}

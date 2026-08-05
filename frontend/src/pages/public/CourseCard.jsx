/*
 * One course card, shared by the landing page and the courses page.
 *
 * `featured` cards carry a tint and larger type; they are the two courses MOP
 * leads with. The index numeral is set in the accent serif — decorative, so it
 * is hidden from assistive tech rather than read out as stray content.
 */

const TINTS = {
  0: 'bg-orange-50 border-orange-200',
  1: 'bg-teal-50 border-teal-200',
};

export default function CourseCard({
  course,
  index,
  featured = false,
  onOpen,
  actionLabel = 'Course details',
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
        {course.badge && (
          <span
            className={`rounded-full px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-white ${
              course.badge === 'New' ? 'bg-teal' : 'bg-navy'
            }`}
          >
            {course.badge}
          </span>
        )}
        <span className="rounded-full bg-navy/5 px-3 py-1 text-[0.72rem] font-medium text-navy-500">
          {course.duration}
        </span>
      </div>

      <p className="mt-4 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-orange-ink">
        {course.ctcAvg}
        {course.ctcHigh ? ` · ${course.ctcHigh}` : ''}
      </p>

      <h3
        className={`mt-2 font-extrabold tracking-tight text-navy ${
          featured ? 'text-[1.45rem] leading-tight' : 'text-[1.05rem] leading-snug'
        }`}
      >
        {course.name}
      </h3>

      <p className="mt-2.5 text-[0.89rem] text-navy-500">{course.summary}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {course.skills.map((s) => (
          <span
            key={s}
            className="rounded-full bg-navy/[0.04] px-2.5 py-1 text-[0.72rem] text-navy-500"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-4 pt-6">
        <button
          type="button"
          onClick={onOpen}
          className="text-[0.84rem] font-semibold text-teal-ink transition hover:text-teal-700"
        >
          {actionLabel}
        </button>
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-navy-100 bg-white text-navy"
        >
          &rarr;
        </span>
      </div>
    </article>
  );
}

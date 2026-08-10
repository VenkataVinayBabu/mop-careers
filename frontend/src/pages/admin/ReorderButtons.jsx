/*
 * Up/down controls for an ordered content list.
 *
 * Buttons rather than drag-and-drop: dragging needs a pointer, a steady hand
 * and a mouse, and these lists are a dozen rows that get rearranged once.
 * Each carries the row's name, or a screen reader hears "move up" a dozen
 * times with nothing to distinguish them.
 */
export default function ReorderButtons({ index, total, label, disabled, onMove }) {
  const btn =
    'rounded p-1 text-navy-400 transition hover:bg-navy-50 hover:text-navy ' +
    'disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy-400';

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onMove(index, -1)}
        disabled={index === 0 || disabled}
        aria-label={`Move ${label} up`}
        className={btn}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m18 15-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onMove(index, 1)}
        disabled={index === total - 1 || disabled}
        aria-label={`Move ${label} down`}
        className={btn}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

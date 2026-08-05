import { useEffect, useRef, useState } from 'react';

/*
 * A number that counts up from zero when it scrolls into view.
 *
 * Two deliberate behaviours:
 *
 *  - It fires on VISIBILITY, not on mount. Stats sit well down the page, so
 *    animating at load means the visitor arrives to numbers that have already
 *    finished. It also runs once and then disconnects — re-running on every
 *    scroll past is distracting rather than impressive.
 *
 *  - It respects `prefers-reduced-motion`. Counters are exactly the kind of
 *    movement that triggers discomfort for people with vestibular disorders,
 *    so those visitors get the final value immediately with no animation.
 *
 * `prefix` and `suffix` are rendered outside the animated digits so the rupee
 * sign and the trailing +/%/L stay put instead of flickering.
 */

const DURATION = 1400;

// Decelerating curve — fast to begin with, easing into the final value.
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function CountUp({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  suffixClassName = '',
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setShown(value);
      return undefined;
    }

    let frame;
    const run = () => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / DURATION);
        setShown(value * easeOut(t));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    /*
     * Disconnecting inside the callback is what makes this run once — do NOT
     * add a ref as an extra guard. A ref survives StrictMode's mount/unmount/
     * remount, so the first pass would claim the guard and start the animation,
     * the cleanup would cancel it, and the second pass would refuse to run.
     * The number then sits at zero forever.
     */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          run();
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value]);

  const text = shown.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      <span className="tabular-nums">{text}</span>
      <span className={suffixClassName}>{suffix}</span>
    </span>
  );
}

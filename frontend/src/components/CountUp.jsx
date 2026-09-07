import { useEffect, useRef, useState } from 'react';

/*
 * A number that counts up from zero when it scrolls into view.
 *
 * THE RULE THIS COMPONENT BROKE, AND NOW KEEPS: the number on screen is never
 * anything but a value between zero and the real one. It went live showing
 * "-3,657+ learners placed" and "-303% placement rate", and separately sat at
 * "0+" and "₹0.0L" — the same four statistics, wrong in two different
 * directions, on the page whose whole job is to be believed. Both causes are
 * below, and both are guarded rather than merely fixed, because a display bug
 * in a counter is invisible in code review and obvious to every visitor.
 *
 * Three deliberate behaviours:
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
 *  - It gives up gracefully. If the animation has not started within
 *    FAILSAFE_MS the real number is simply shown. See `settle`.
 *
 * `prefix` and `suffix` are rendered outside the animated digits so the rupee
 * sign and the trailing +/%/L stay put instead of flickering.
 */

const DURATION = 1400;

/*
 * How long to wait before abandoning the animation and showing the number.
 *
 * WHY THIS EXISTS. A browser only runs rendering steps — and therefore
 * IntersectionObserver callbacks and requestAnimationFrame — for a tab it is
 * actually painting. In a background tab, a throttled one, a screenshot
 * service or a crawler, neither ever fires, and a counter that only ever
 * learns its value from the animation stays on its initial 0 forever. That is
 * where "0+ total placements, ₹0.0L highest package" came from: not missing
 * data, which was correct and present the whole time, but a number that is
 * only ever painted by an animation that never ran.
 *
 * Comfortably longer than the animation, so it only ever fires when the
 * animation genuinely did not happen.
 */
const FAILSAFE_MS = 4000;

/* Grace on top of DURATION before an animation that HAS started is abandoned
   and snapped to its final value. Long enough that a slow frame never trips
   it, short enough that a backgrounded tab is not left mid-count. */
const FAILSAFE_SLACK_MS = 1500;

// Decelerating curve — fast to begin with, easing into the final value.
// Only ever called with t in [0, 1]; see the clamp in `tick`.
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

    let frame;
    let failsafe;
    let started = false;

    // The end state, arrived at directly. Used by reduced-motion, by the
    // failsafe, and by anything that cannot animate.
    const settle = () => {
      started = true;
      clearTimeout(failsafe);
      setShown(value);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      settle();
      return () => clearTimeout(failsafe);
    }

    const run = () => {
      if (started) return;
      started = true;
      /*
       * Re-armed rather than cleared. requestAnimationFrame stops in a tab the
       * browser is not painting, so an animation that begins and is then
       * backgrounded freezes wherever it got to — a counter reading 320 of
       * 1,050, which is what a screenshot service captures and a returning
       * visitor sees. setTimeout keeps running when rAF does not, so this is
       * the one clock that can still finish the job. Cleared on the frame that
       * completes the animation.
       */
      clearTimeout(failsafe);
      failsafe = setTimeout(settle, DURATION + FAILSAFE_SLACK_MS);

      /*
       * The origin is the FIRST FRAME's timestamp, not `performance.now()`
       * read here.
       *
       * WHY. This function is called from the IntersectionObserver callback,
       * and the timestamp requestAnimationFrame passes is the time the frame
       * began — which can predate this line by a long way when the browser has
       * been throttling, or when a tab has just come back to the foreground.
       * Reading the clock here and subtracting a stale frame time gave a
       * NEGATIVE elapsed of about -900ms, so t was about -0.65, and
       * `1 - (1 - t)^3` is -3.48 at that point. Every statistic rendered at
       * -3.48 times its real value on the same frame: -3,657 learners placed,
       * -₹165.8L, -1,741 partners, -303% placement rate. Taking the origin
       * from the frame itself means both times come off the same clock.
       */
      let origin = null;
      const tick = (now) => {
        if (origin === null) origin = now;
        // Clamped at BOTH ends. The lower clamp is the guard: even if some
        // future browser hands back a timestamp before the origin, the worst
        // it can render is 0 rather than a negative headline figure.
        const t = Math.min(1, Math.max(0, (now - origin) / DURATION));
        setShown(value * easeOut(t));
        if (t < 1) frame = requestAnimationFrame(tick);
        else clearTimeout(failsafe);
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
    failsafe = setTimeout(settle, FAILSAFE_MS);

    return () => {
      observer.disconnect();
      clearTimeout(failsafe);
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

/*
 * ============================================================================
 *  LOGO — the real mark, in three variants.
 * ============================================================================
 *  All three are derived from the single supplied artwork:
 *
 *    logo.png        full lockup, cropped tight, transparent
 *    logo-white.png  navy recoloured to white, for dark grounds
 *    logo-mark.png   the M-O-P rocket alone, no wordmark
 *
 *  Pick with `variant`:
 *    dark   (default) full colour lockup — use on white/paper
 *    light            reversed lockup — use on navy
 *    mark             icon only — tight spaces and favicons
 *
 *  The lockup is roughly 3.6:1, so it is sized by HEIGHT everywhere and the
 *  width follows. The tagline inside the artwork stops being readable below
 *  about 36px tall — use `mark` rather than shrinking the lockup further.
 * ============================================================================
 */

import logoColour from '../assets/logo.png';
import logoWhite from '../assets/logo-white.png';
import logoMark from '../assets/logo-mark.png';

const SIZES = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-12 sm:h-14',
  xl: 'h-16 sm:h-20',
};

const SOURCES = {
  dark: logoColour,
  light: logoWhite,
  mark: logoMark,
};

export default function Logo({ size = 'md', variant = 'dark', className = '' }) {
  const height = SIZES[size] || SIZES.md;
  const src = SOURCES[variant] || SOURCES.dark;

  return (
    <img
      src={src}
      alt="MOP Careers — Your Future. Our Priority."
      className={`${height} w-auto ${className}`}
    />
  );
}

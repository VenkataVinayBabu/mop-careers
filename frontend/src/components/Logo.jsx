/*
 * ============================================================================
 *  LOGO SLOT — swap the text mark for an image here.
 * ============================================================================
 *  Right now this renders the text wordmark "MOP CAREERS".
 *
 *  To use a real logo instead:
 *    1. Drop the file at  frontend/src/assets/logo.png  (or .svg)
 *    2. Uncomment the import below.
 *    3. Set USE_IMAGE_LOGO = true.
 *
 *  Nothing else in the app needs to change — every screen renders <Logo />.
 * ============================================================================
 */

// import logoImage from '../assets/logo.png';
const logoImage = null;
const USE_IMAGE_LOGO = false;

const SIZES = {
  sm: { text: 'text-base', img: 'h-7' },
  md: { text: 'text-xl', img: 'h-9' },
  lg: { text: 'text-3xl sm:text-4xl', img: 'h-12' },
};

export default function Logo({ size = 'md', variant = 'dark', className = '' }) {
  const s = SIZES[size] || SIZES.md;

  if (USE_IMAGE_LOGO && logoImage) {
    return <img src={logoImage} alt="MOP Careers" className={`${s.img} w-auto ${className}`} />;
  }

  // "MOP" takes the accent colour, "CAREERS" the neutral one.
  const mop = variant === 'light' ? 'text-white' : 'text-navy';
  const careers = variant === 'light' ? 'text-teal-200' : 'text-teal';

  return (
    <span
      className={`font-extrabold tracking-tight ${s.text} ${className}`}
      aria-label="MOP Careers"
    >
      <span className={mop}>MOP</span>
      <span className={careers}> CAREERS</span>
    </span>
  );
}

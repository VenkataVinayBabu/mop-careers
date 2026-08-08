/*
 * A person's portrait, or a monogram standing in for one.
 *
 * The monogram is NOT a stock photo of someone else. Every name on this site
 * belongs to a real mentor or a real learner, and putting a stranger's face
 * beside a real person's name misrepresents them — so the fallback is
 * typographic and obviously a placeholder, while still looking designed.
 *
 * Tints cycle by position in the list, so no two cards side by side share a
 * colour. Hashing the name was tried first — it survives reordering, but with
 * only four people it kept collapsing to two colours across four cards, which
 * is exactly the repetition this is meant to avoid. Position wins because the
 * point here is visual, not identity.
 *
 * Passing no index falls back to a stable per-name hash, so a one-off avatar
 * outside a list still gets a consistent colour rather than always the first.
 *
 * When a real photo arrives, set `photo` in the data and the image takes over.
 */

const TINTS = [
  'bg-teal-50 text-teal-ink',
  'bg-orange-50 text-orange-ink',
  'bg-navy-50 text-navy',
  'bg-[#E9F6EE] text-[#14713F]',
];

function tintFor(name, index) {
  if (Number.isInteger(index)) return TINTS[index % TINTS.length];
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function initialsOf(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function Avatar({
  name,
  photo,
  index,
  className = '',
  textClassName = 'text-[0.78rem]',
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        loading="lazy"
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center font-bold tracking-tight ${tintFor(name, index)} ${className}`}
    >
      <span className={textClassName}>{initialsOf(name)}</span>
    </span>
  );
}

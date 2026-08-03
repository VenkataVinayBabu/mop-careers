import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password field with a show/hide toggle.
 *
 * The toggle is a real button so it's reachable by keyboard, but it carries
 * tabIndex={-1} so tabbing through a form goes field-to-field rather than
 * stopping on every eye icon.
 */
export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  required = true,
}) {
  const [visible, setVisible] = useState(false);
  const generated = useId();
  const inputId = id || generated;

  return (
    <div>
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          className="input pr-11"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-navy-300 transition hover:text-navy-600"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

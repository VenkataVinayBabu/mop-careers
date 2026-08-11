import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { ErrorState, Loading, PageHeader } from '../../components/ui';
import { applySiteSettings } from '../../data/siteSettings';
import WebsiteTabs from './WebsiteTabs';

/*
 * Admin > Website — the first content-management screen.
 *
 * The point of it is that Bala can change the phone number, the WhatsApp
 * number, the announcement strip or where enquiries are delivered without a
 * developer and a git push. Everything here is live the moment it is saved.
 *
 * Two things this screen does deliberately:
 *
 *  - It sends ONLY the fields that changed. The API treats an absent field as
 *    "leave it alone", so a stale tab saving one field cannot blank the rest.
 *  - It hands the saved response straight to the public-site store, so the
 *    footer in another tab of this same app is correct immediately rather than
 *    on the next page load.
 */

/* Every field on the form, grouped the way someone thinks about them rather
   than the way they are stored. `hint` is doing real work here: half of these
   have a non-obvious consequence when left blank. */
const SECTIONS = [
  {
    title: 'Contact details',
    caption: 'Shown in the footer of every public page.',
    fields: [
      { key: 'email', label: 'Email address', placeholder: 'hello@mopcareers.com',
        hint: 'The address published on the site. Where enquiries are delivered is set further down.' },
      { key: 'phone', label: 'Phone number', placeholder: '+91 98908 13235',
        hint: 'Shown as a tap-to-call link on a phone.' },
      { key: 'address', label: 'Address', placeholder: 'HSR Layout, Bengaluru — Karnataka 560102' },
    ],
  },
  {
    title: 'WhatsApp',
    caption: 'Drives the floating chat button and the WhatsApp links.',
    fields: [
      { key: 'whatsapp', label: 'WhatsApp number', placeholder: '919890813235',
        hint: 'With the country code. Spaces, + and dashes are fine — they get stripped. Leave it blank and every WhatsApp button falls back to the enquiry form, which is better than opening a chat with a number that does not answer.' },
      { key: 'whatsapp_message', label: 'Pre-filled message', max: 300,
        placeholder: "Hi MOP Careers, I'd like to know more about your programs.",
        hint: 'What is already typed for the visitor when the chat opens.' },
    ],
  },
  {
    title: 'Announcement bar',
    caption: 'The dark strip above the navigation on the public site.',
    fields: [
      { key: 'announcement_enabled', label: 'Show the announcement bar', type: 'toggle' },
      { key: 'announcement_tag', label: 'Tag', placeholder: 'Now enrolling',
        hint: 'The small orange pill. Leave it blank for no pill.' },
      { key: 'announcement', label: 'Message', max: 160,
        placeholder: 'Applications open for the next cohort' },
    ],
  },
  {
    title: 'Social links',
    caption: 'Only the ones you fill in appear. Full links, starting with https://.',
    fields: [
      { key: 'social_linkedin', label: 'LinkedIn', half: true, placeholder: 'https://www.linkedin.com/company/…' },
      { key: 'social_instagram', label: 'Instagram', half: true, placeholder: 'https://www.instagram.com/…' },
      { key: 'social_youtube', label: 'YouTube', half: true, placeholder: 'https://www.youtube.com/@…' },
      { key: 'social_facebook', label: 'Facebook', half: true, placeholder: 'https://www.facebook.com/…' },
    ],
  },
  {
    title: 'Standard fees',
    caption: 'The fee structure shown on every programme page. A programme can override any of it from its own editor.',
    fields: [
      { key: 'fee_registration', label: 'Registration fee', half: true, placeholder: '₹50,000',
        hint: 'Paid up front to start classes.' },
      { key: 'fee_registration_was', label: 'Registration — was', half: true, placeholder: '₹90,000',
        hint: 'Shown struck through beside it. Blank for no strike-through.' },
      { key: 'fee_registration_note', label: 'Registration note', max: 200,
        placeholder: 'Inclusive of taxes · pay to start classes' },
      { key: 'fee_tuition', label: 'Tuition', half: true, placeholder: '₹1,20,000 + GST',
        hint: 'The Pay After Placement amount.' },
      { key: 'fee_tuition_was', label: 'Tuition — was', half: true, placeholder: '₹1,60,000' },
      { key: 'fee_tuition_note', label: 'Tuition note', max: 200,
        placeholder: 'Payable only after you accept an offer at your agreed CTC. No loans.' },
      { key: 'fee_emi', label: 'EMI option', placeholder: '₹5,000 / month',
        hint: 'Shown as a line under the fees heading. Blank to leave it out.' },
    ],
  },
  {
    title: 'Where notifications go',
    caption: 'Internal only — these are never shown on the website.',
    fields: [
      { key: 'enquiry_email', label: 'Enquiries from the website',
        hint: 'Every enquiry form submission is emailed here. Leave it blank to keep using the address configured on the server.' },
      { key: 'doubts_email', label: 'Student doubts',
        hint: 'Technical and other doubts land here, as do class doubts from a batch with no teacher assigned. Blank keeps the server default.' },
    ],
  },
];

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

/* FastAPI validation errors arrive as [{loc: ['body', 'email'], msg}], which
   is enough to put each message under the field that caused it rather than
   dropping the lot into one toast. */
function fieldErrors(err) {
  const detail = err?.response?.data?.detail;
  if (!Array.isArray(detail)) return {};
  const out = {};
  detail.forEach((d) => {
    const key = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
    if (key && ALL_KEYS.includes(key)) out[key] = d.msg.replace(/^Value error, /, '');
  });
  return out;
}

function Toggle({ checked, onChange, label, id }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="block h-6 w-11 rounded-full bg-navy-200 transition peer-checked:bg-teal peer-focus-visible:ring-2 peer-focus-visible:ring-teal peer-focus-visible:ring-offset-2" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
      <span className="text-sm font-medium text-navy-700">{label}</span>
    </label>
  );
}

export default function AdminWebsite() {
  const toast = useToast();
  const { user } = useAuth();
  const [initial, setInitial] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await api.get('/admin/website/settings');
      setInitial(data);
      setForm(data);
      setErrors({});
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* The changed subset IS the request body, so it is worth computing once and
     using for both the dirty check and the save. */
  const changed = useMemo(() => {
    if (!form || !initial) return {};
    return Object.fromEntries(
      ALL_KEYS.filter((k) => form[k] !== initial[k]).map((k) => [k, form[k]]),
    );
  }, [form, initial]);

  const dirty = Object.keys(changed).length > 0;

  /* Warn before closing the tab with unsaved edits. Someone who has just
     retyped an address should not lose it to a stray Ctrl-W. */
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setErrors({});
    try {
      /* A contributor publishes nothing: this becomes a proposal, and the form
         deliberately keeps showing the live values underneath it. */
      if (user?.role === 'contributor') {
        await api.post('/admin/website/changes', {
          entity: 'settings', action: 'update', entity_id: null, payload: changed,
        });
        toast.success('Sent for approval. It goes live once a member approves it.');
        setSaving(false);
        return;
      }
      const { data } = await api.put('/admin/website/settings', changed);
      setInitial(data);
      setForm(data);
      // The public site reads from a client-side store; hand it the fresh
      // values so this tab is correct without a reload.
      applySiteSettings(data);
      toast.success('Website updated. The public site is showing this now.');
    } catch (err) {
      const byField = fieldErrors(err);
      setErrors(byField);
      toast.error(
        Object.keys(byField).length
          ? 'Some fields need fixing — see the messages below.'
          : errorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading website settings…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  return (
    <form onSubmit={save}>
      <WebsiteTabs />
      <PageHeader
        title="Website settings"
        subtitle="Contact details, announcements and links shown on the public site"
      />

      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <section key={section.title} className="card p-5">
            <h2 className="text-base font-semibold text-navy">{section.title}</h2>
            <p className="mt-0.5 text-sm text-navy-500">{section.caption}</p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {section.fields.map((field) => {
                const id = `site-${field.key}`;
                const error = errors[field.key];
                const value = form[field.key];

                if (field.type === 'toggle') {
                  return (
                    <div key={field.key} className="sm:col-span-2">
                      <Toggle
                        id={id}
                        label={field.label}
                        checked={Boolean(value)}
                        onChange={(v) => set(field.key, v)}
                      />
                    </div>
                  );
                }

                return (
                  <div key={field.key} className={field.half ? '' : 'sm:col-span-2'}>
                    <label className="label" htmlFor={id}>
                      {field.label}
                    </label>
                    {/* Every input is type="text", including the addresses.
                        type="email" would hand the browser its own validation,
                        which blocks submit with a native bubble and bypasses
                        the inline messages below — and it disagrees with the
                        API about whether blank is allowed. One validator. */}
                    <input
                      id={id}
                      type="text"
                      className={`input ${error ? 'border-orange focus:border-orange focus:ring-orange' : ''}`}
                      value={value ?? ''}
                      maxLength={field.max}
                      placeholder={field.placeholder}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `${id}-error` : undefined}
                      onChange={(ev) => set(field.key, ev.target.value)}
                    />
                    <div className="mt-1.5 flex items-start justify-between gap-4">
                      <p
                        id={error ? `${id}-error` : undefined}
                        className={`text-xs ${error ? 'font-medium text-orange-ink' : 'text-navy-400'}`}
                      >
                        {error || field.hint || ''}
                      </p>
                      {/* A live counter rather than a silent truncation — the
                          strip is a fixed-height bar and a long message wraps
                          it into two lines. */}
                      {field.max && (
                        <span className="shrink-0 text-xs tabular-nums text-navy-400">
                          {(value ?? '').length}/{field.max}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky so the button is reachable from any field without scrolling to
          the bottom of a five-section form. */}
      <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 bg-white/95 p-4 shadow-card backdrop-blur">
        <p className="text-sm text-navy-500">
          {dirty
            ? `${Object.keys(changed).length} unsaved change${Object.keys(changed).length === 1 ? '' : 's'}.`
            : 'Everything here is live on the public site.'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost"
            disabled={!dirty || saving}
            onClick={() => {
              setForm(initial);
              setErrors({});
            }}
          >
            Discard
          </button>
          <button type="submit" className="btn-cta" disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

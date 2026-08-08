import { useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { Spinner } from '../../components/ui';
import { PROGRAM_OPTIONS } from '../../data/programs';
import useSlowRequest from '../../hooks/useSlowRequest';

/*
 * The only unauthenticated write on the API. The endpoint saves the enquiry
 * before it attempts the notification email, so a mail failure never loses a
 * lead — and it is rate limited per IP, which is why the 429 case gets its own
 * readable message rather than a generic failure.
 */

export default function EnquiryForm() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', programme: '', message: '',
  });
  const [status, setStatus] = useState({ state: 'idle', text: '' });
  const slow = useSlowRequest(status.state === 'sending');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ state: 'sending', text: '' });
    try {
      const { data } = await api.post('/public/enquiries', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        programme: form.programme || null,
        message: form.message.trim(),
      });
      setStatus({ state: 'sent', text: data.message });
      setForm({ name: '', phone: '', email: '', programme: '', message: '' });
    } catch (err) {
      setStatus({ state: 'error', text: errorMessage(err) });
    }
  };

  if (status.state === 'sent') {
    return (
      <div className="rounded-[22px] border border-navy-100 bg-white p-8 text-center shadow-pop">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-teal-50 text-2xl text-teal">
          &#10003;
        </div>
        <h3 className="text-lg font-bold text-navy">Enquiry received</h3>
        <p className="mt-2 text-sm text-navy-500">{status.text}</p>
        <button
          type="button"
          onClick={() => setStatus({ state: 'idle', text: '' })}
          className="pbtn-outline pbtn-sm mt-6"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const busy = status.state === 'sending';

  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-[22px] border border-navy-100 bg-white p-6 shadow-pop sm:p-7"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="en-name">Full name</label>
          <input id="en-name" className="input" required value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label" htmlFor="en-phone">Phone</label>
          <input id="en-phone" className="input" required placeholder="10-digit mobile"
                 value={form.phone} onChange={set('phone')} />
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="en-email">Email</label>
        <input id="en-email" type="email" className="input" required value={form.email} onChange={set('email')} />
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="en-program">Which program?</label>
        <select id="en-program" className="input" value={form.programme} onChange={set('programme')}>
          <option value="">Select a program…</option>
          {PROGRAM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="en-message">Anything you&apos;d like to ask</label>
        <textarea id="en-message" rows={3} className="input" required
                  placeholder="Fees, eligibility, schedule…"
                  value={form.message} onChange={set('message')} />
      </div>

      {status.state === 'error' && (
        <div role="alert"
             className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          {status.text}
        </div>
      )}

      {/* The API sleeps when idle; a silent minute reads as a broken form. */}
      {slow && (
        <div role="status"
             className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
          Still sending — the first message after a quiet period can take up to a minute.
          Your enquiry has not been lost.
        </div>
      )}

      <button type="submit" disabled={busy} className="pbtn-primary mt-5 w-full">
        {busy && <Spinner className="h-4 w-4" />}
        {busy ? 'Sending…' : 'Request a call back'}
      </button>
      <p className="mt-3 text-center text-xs text-navy-400">
        We reply within one working day.
      </p>
    </form>
  );
}

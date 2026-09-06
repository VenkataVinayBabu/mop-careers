import { useState } from 'react';

import { api, errorMessage } from '../api/client';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';

/*
 * Download a table as a CSV that Excel opens.
 *
 * ADMIN ONLY, and enforced on the server as well — the API guards these routes
 * with require_admin, so hiding the button is presentation, not security. It
 * renders nothing for anyone else rather than showing a control that would
 * 403: a button that only fails is worse than no button.
 *
 * WHY A FETCH AND NOT A LINK. An <a href> sends no Authorization header, so
 * the download would come back 401. The file has to be fetched with the token
 * like any other request, turned into a blob, and handed to the browser.
 *
 * The filename is built here rather than read from the response's
 * Content-Disposition, because reading that header cross-origin needs the API
 * to expose it via CORS. The date is the client's, which is what the person
 * downloading it expects to see anyway.
 */
export default function ExportButton({ path, prefix, label = 'Download for Excel' }) {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (user?.role !== 'admin') return null;

  async function download() {
    setBusy(true);
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Released on the next tick: revoking synchronously can cancel the
      // download in some browsers before it has started reading the blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not download the file'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={download} disabled={busy} className="btn-secondary">
      {busy ? 'Preparing…' : label}
    </button>
  );
}

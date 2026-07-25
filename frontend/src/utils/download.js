import { api } from '../api/client';

/**
 * Notes are served from an authenticated endpoint, so a plain <a href> would be
 * rejected — fetch as a blob with the JWT attached, then trigger a download.
 */
export async function downloadNotes(dayId, dayNumber) {
  const { data } = await api.get(`/files/notes/${dayId}`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MOP_Day${dayNumber}_Notes.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

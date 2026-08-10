import { useCallback, useEffect, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';

/*
 * The parts every Website content screen shares.
 *
 * Mentors, stories and hiring partners are the same screen with different
 * fields: a list ordered by drag-free up/down buttons, a publish toggle, a
 * modal form, and delete. This holds the async half of that — loading,
 * creating, updating, deleting and reordering — so each screen file is only
 * its own fields and its own row layout.
 *
 * What is deliberately NOT here: the row markup and the form. Those are the
 * part a reader actually needs to see per entity, and pushing them behind a
 * config object would turn three readable screens into one unreadable one.
 */

/** FastAPI validation errors arrive as [{loc: ['body','name'], msg}]. Worth
 *  unpacking so each message can land under the field that caused it. */
export function fieldErrors(err) {
  const detail = err?.response?.data?.detail;
  if (!Array.isArray(detail)) return {};
  const out = {};
  detail.forEach((d) => {
    const key = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
    if (key) out[key] = String(d.msg).replace(/^Value error, /, '');
  });
  return out;
}

/**
 * @param endpoint  e.g. '/admin/website/stories'
 * @param onAdopt   called with the full admin list after every change, so the
 *                  screen can push the published subset into the public store
 * @param label     singular noun for toasts, e.g. 'story'
 */
export function useContentList(endpoint, onAdopt, label) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const adopt = useCallback((all) => {
    setRows(all);
    onAdopt(all);
  }, [onAdopt]);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await api.get(endpoint);
      adopt(data);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [endpoint, adopt]);

  useEffect(() => {
    load();
  }, [load]);

  /** Create or update, depending on whether `existing` has an id.
   *  Resolves true on success so the caller can close its modal. */
  const save = async (existing, body) => {
    if (saving) return false;
    setSaving(true);
    setErrors({});
    try {
      if (existing?.id) {
        const { data } = await api.put(`${endpoint}/${existing.id}`, body);
        adopt(rows.map((r) => (r.id === data.id ? data : r)));
        toast.success(`${data.name} updated.`);
      } else {
        const { data } = await api.post(endpoint, body);
        adopt([...rows, data]);
        toast.success(`${data.name} added to the site.`);
      }
      return true;
    } catch (err) {
      const byField = fieldErrors(err);
      setErrors(byField);
      if (!Object.keys(byField).length) toast.error(errorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (row) => {
    setBusyId(row.id);
    try {
      const { data } = await api.put(`${endpoint}/${row.id}`, { published: !row.published });
      adopt(rows.map((r) => (r.id === data.id ? data : r)));
      toast.info(data.published ? `${data.name} is on the site.` : `${data.name} is hidden.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row) => {
    /* One deliberate confirmation, with the name in it so it cannot be the
       wrong row. These are named people and real companies. */
    if (!window.confirm(`Remove ${row.name} from the website? This cannot be undone.`)) return;
    setBusyId(row.id);
    try {
      await api.delete(`${endpoint}/${row.id}`);
      adopt(rows.filter((r) => r.id !== row.id));
      toast.info(`${row.name} removed.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  /* Reorder sends the whole list rather than "move this one up", so a request
     cannot leave the table half-sorted. Applied locally first so the row does
     not visibly lag the click, and reloaded from the server if it fails. */
  const move = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    setBusyId(rows[index].id);
    try {
      const { data } = await api.post(`${endpoint}/reorder`, { ids: next.map((r) => r.id) });
      adopt(data);
    } catch (err) {
      toast.error(errorMessage(err));
      load(); // put the real order back
    } finally {
      setBusyId(null);
    }
  };

  return {
    rows, loading, loadError, busyId, saving, errors, setErrors,
    load, save, togglePublished, remove, move, label,
  };
}

import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, errorMessage } from '../../api/client';
import { useToast } from '../../components/Toast';
import {
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
  ProgressBar,
  Spinner,
  StatCard,
} from '../../components/ui';
import { PAYMENT_MODES, formatDate, formatMoney } from '../../constants';

const today = () => new Date().toISOString().slice(0, 10);

/** Set the total fee, record payments, remove mistakes. */
function FeeModal({ studentId, onClose, onChanged }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [totalFee, setTotalFee] = useState('');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState({ amount: '', paid_on: today(), mode: 'UPI', reference: '' });

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/fees/${studentId}`);
      setData(res.data);
      setTotalFee(String(res.data.total_fee ?? ''));
      setNotes(res.data.notes || '');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveTotal = async () => {
    const value = Number(totalFee);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a valid total fee.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.put(`/admin/fees/${studentId}`, {
        total_fee: value,
        notes: notes.trim() || null,
      });
      setData(res.data);
      toast.success('Total fee saved.');
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addPayment = async () => {
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a payment amount greater than zero.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(`/admin/fees/${studentId}/payments`, {
        amount,
        paid_on: payment.paid_on,
        mode: payment.mode,
        reference: payment.reference.trim() || null,
      });
      setData(res.data);
      setPayment({ amount: '', paid_on: today(), mode: 'UPI', reference: '' });
      toast.success('Payment recorded.');
      onChanged();
    } catch (err) {
      // The API refuses anything above the outstanding balance.
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const removePayment = async (paymentId) => {
    setBusy(true);
    try {
      const res = await api.delete(`/admin/fees/${studentId}/payments/${paymentId}`);
      setData(res.data);
      toast.info('Payment removed.');
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={data ? `Fees — ${data.student_name}` : 'Fees'}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="btn-ghost">
          Done
        </button>
      }
    >
      {loading ? (
        <Loading label="Loading fee record…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-navy-50 p-4 text-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-navy-400">Total</p>
              <p className="mt-1 font-bold text-navy">{formatMoney(data.total_fee)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-navy-400">Paid</p>
              <p className="mt-1 font-bold text-teal">{formatMoney(data.paid)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-navy-400">Balance</p>
              <p className={`mt-1 font-bold ${data.balance > 0 ? 'text-orange' : 'text-teal'}`}>
                {formatMoney(data.balance)}
              </p>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="total">
              Total fee
            </label>
            <div className="flex gap-2">
              <input
                id="total"
                type="number"
                min="0"
                step="500"
                className="input"
                value={totalFee}
                onChange={(e) => setTotalFee(e.target.value)}
              />
              <button type="button" onClick={saveTotal} disabled={busy} className="btn-primary shrink-0">
                Save
              </button>
            </div>
            <input
              className="input mt-2"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="border-t border-navy-100 pt-5">
            <p className="label">Record a payment</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="number"
                min="1"
                step="500"
                className="input"
                placeholder="Amount"
                value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
              />
              <input
                type="date"
                className="input"
                value={payment.paid_on}
                onChange={(e) => setPayment({ ...payment, paid_on: e.target.value })}
              />
              <select
                className="input"
                value={payment.mode}
                onChange={(e) => setPayment({ ...payment, mode: e.target.value })}
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Reference (optional)"
                value={payment.reference}
                onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
              />
            </div>
            <button type="button" onClick={addPayment} disabled={busy} className="btn-cta mt-3 w-full">
              {busy && <Spinner className="h-4 w-4" />}
              Add payment
            </button>
          </div>

          <div className="border-t border-navy-100 pt-5">
            <p className="label">Payment history</p>
            {data.payments.length === 0 ? (
              <p className="text-sm text-navy-400">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-navy-100">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy">{formatMoney(p.amount)}</p>
                      <p className="text-xs text-navy-400">
                        {formatDate(p.paid_on)} · {p.mode}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePayment(p.id)}
                      disabled={busy}
                      className="btn-ghost btn-sm shrink-0 text-orange"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function AdminFees() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [managing, setManaging] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const [f, s] = await Promise.all([
        api.get('/admin/fees'),
        api.get('/admin/fees/summary'),
      ]);
      setRows(f.data);
      setSummary(s.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const billed = rows.reduce((a, r) => a + r.total_fee, 0);
    const paid = rows.reduce((a, r) => a + r.paid, 0);
    return {
      billed,
      paid,
      outstanding: billed - paid,
      pendingCount: rows.filter((r) => r.balance > 0).length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !pendingOnly || r.balance > 0)
      .filter((r) => !q || r.student_name.toLowerCase().includes(q));
  }, [rows, pendingOnly, query]);

  if (loading) return <Loading label="Loading fees…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Fees" subtitle="Admin only — students never see fee data" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total billed" value={formatMoney(totals.billed)} />
        <StatCard label="Collected" value={formatMoney(totals.paid)} tone="teal" />
        <StatCard
          label="Outstanding"
          value={formatMoney(totals.outstanding)}
          tone={totals.outstanding > 0 ? 'orange' : 'teal'}
        />
        <StatCard
          label="Students pending"
          value={totals.pendingCount}
          tone={totals.pendingCount > 0 ? 'orange' : 'teal'}
          hint={`of ${rows.length}`}
        />
      </div>

      {summary.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
            Collection by batch
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {summary.map((s) => (
              <div key={s.batch_id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-navy">{s.batch_name}</h3>
                    <p className="text-xs text-navy-400">
                      {s.student_count} student{s.student_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className={s.collection_percent >= 100 ? 'badge-done' : 'badge-warn'}>
                    {s.collection_percent}%
                  </span>
                </div>
                <div className="mt-3">
                  <ProgressBar
                    value={s.total_collected}
                    max={s.total_billed || 1}
                    tone={s.collection_percent >= 100 ? 'teal' : 'orange'}
                  />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-navy-400">Billed</dt>
                    <dd className="font-semibold text-navy">{formatMoney(s.total_billed)}</dd>
                  </div>
                  <div>
                    <dt className="text-navy-400">Collected</dt>
                    <dd className="font-semibold text-teal">{formatMoney(s.total_collected)}</dd>
                  </div>
                  <div>
                    <dt className="text-navy-400">Outstanding</dt>
                    <dd className="font-semibold text-orange">{formatMoney(s.outstanding)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setPendingOnly((v) => !v)}
          className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
            pendingOnly
              ? 'bg-orange text-white'
              : 'border border-navy-200 bg-white text-navy-600 hover:bg-navy-50'
          }`}
        >
          {pendingOnly ? 'Showing pending only' : 'Show pending only'}
        </button>
        <input
          type="search"
          className="input sm:max-w-xs"
          placeholder="Search students…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="card">
        {visible.length === 0 ? (
          <EmptyState
            title={pendingOnly ? 'Nothing outstanding' : 'No students'}
            message={
              pendingOnly
                ? 'Every student has paid their fee in full.'
                : 'Create student accounts to start tracking fees.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-navy-100">
              <thead className="bg-navy-50">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Batch</th>
                  <th className="th">Total</th>
                  <th className="th">Paid</th>
                  <th className="th">Balance</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {visible.map((r) => (
                  <tr key={r.student_id}>
                    <td className="td font-medium text-navy">{r.student_name}</td>
                    <td className="td text-navy-400">{r.batch_name || '—'}</td>
                    <td className="td">{formatMoney(r.total_fee)}</td>
                    <td className="td text-teal">{formatMoney(r.paid)}</td>
                    <td className="td">
                      {r.balance > 0 ? (
                        <span className="font-semibold text-orange">{formatMoney(r.balance)}</span>
                      ) : (
                        <span className="badge-done">Paid</span>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setManaging(r.student_id)}
                          className="btn-ghost btn-sm"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {managing && (
        <FeeModal studentId={managing} onClose={() => setManaging(null)} onChanged={load} />
      )}
    </div>
  );
}

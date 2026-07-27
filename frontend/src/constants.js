/** The student roadmap, in order. Keys match the Milestone model fields. */
export const MILESTONE_STEPS = [
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'batch_assigned', label: 'Batch assigned' },
  { key: 'batch_started', label: 'Batch started' },
  { key: 'midpoint_day28', label: 'Midpoint (Day 28)' },
  { key: 'course_completed', label: 'Course completed' },
  { key: 'internship', label: 'Internship' },
  { key: 'placement_ready', label: 'Placement ready' },
  { key: 'offer_received', label: 'Offer received' },
];

export const TOTAL_DAYS = 55;

export function formatDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Application status -> badge class + label. */
export const APPLICATION_STATUS = {
  applied: { label: 'Applied', cls: 'badge-pending' },
  shortlisted: { label: 'Shortlisted', cls: 'badge-pending' },
  interviewing: { label: 'Interviewing', cls: 'badge-warn' },
  offered: { label: 'Offered', cls: 'badge-done' },
  joined: { label: 'Joined', cls: 'badge-done' },
  rejected: { label: 'Rejected', cls: 'badge-warn' },
};

export const APPLICATION_STATUS_KEYS = Object.keys(APPLICATION_STATUS);

export const ROUND_RESULT = {
  pending: { label: 'Pending', cls: 'badge-pending' },
  passed: { label: 'Passed', cls: 'badge-done' },
  failed: { label: 'Failed', cls: 'badge-warn' },
};

export const PAYMENT_MODES = ['UPI', 'cash', 'bank'];

/** Doubt support (Phase 5). */
export const DOUBT_TYPES = {
  class_doubt: {
    label: 'Class doubt',
    hint: 'Goes to your batch teacher.',
  },
  technical: {
    label: 'Technical',
    hint: 'Setup, tooling or environment problems. Goes to the MOP team.',
  },
  other: {
    label: 'Other',
    hint: 'Anything else. Goes to the MOP team.',
  },
};

export const DOUBT_STATUS = {
  open: { label: 'Open', cls: 'badge-warn' },
  answered: { label: 'Answered', cls: 'badge-done' },
};

export const ENQUIRY_STATUSES = ['New', 'Contacted', 'Converted', 'Closed'];

export const ENQUIRY_STATUS_CLS = {
  New: 'badge-warn',
  Contacted: 'badge-pending',
  Converted: 'badge-done',
  Closed: 'badge-pending',
};

export function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Fees are in rupees; packages are in LPA and formatted separately. */
export function formatMoney(value) {
  if (value == null) return '—';
  return rupees.format(value);
}

export function formatLpa(value) {
  if (value == null) return '—';
  return `${Number(value).toFixed(1)} LPA`;
}

export function formatShortDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

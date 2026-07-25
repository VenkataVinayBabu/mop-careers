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

export function formatShortDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

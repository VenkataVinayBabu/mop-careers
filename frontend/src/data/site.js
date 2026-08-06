/*
 * ============================================================================
 *  PUBLIC SITE CONTENT — everything that is not a course.
 * ============================================================================
 *  Same principle as courses.js: shaped like the API rows these will become
 *  once Bala manages them from an admin form, so the swap is an import change.
 *
 *  ---------------------------------------------------------------------------
 *  NOTHING IN THIS FILE IS CONFIRMED.
 *
 *  The mentors, stories and outcome figures are taken from MOP's own live site
 *  (mopcareers.in). They are MOP's existing published claims, not invented
 *  here — but no one has verified them against records, and the students have
 *  not been asked for consent to be quoted on a new site.
 *
 *  Before real traffic arrives:
 *    - confirm every mentor is happy to be named with their former employer
 *    - get written consent for every student quote and photo
 *    - verify the placement figures against actual offer letters
 *    - confirm every company listed has a genuine hiring relationship
 * ============================================================================
 */

/* ---------------------------------------------------------------- settings */
/* These become editable admin fields in the content-management work. Until
   then, a blank value makes the UI fall back gracefully rather than render a
   broken link. */
export const SITE = {
  // Digits only, including country code, e.g. '919876543210'.
  // EMPTY until MOP supplies the real number — the WhatsApp buttons fall back
  // to the enquiry form rather than opening a chat with nobody.
  whatsapp: '',
  whatsappMessage: "Hi MOP Careers, I'd like to know more about your courses.",

  phone: '',
  email: '',
  address: '',

  announcement: 'Applications open for the next cohort',
  announcementTag: 'Now enrolling',

  social: {
    linkedin: '',
    instagram: '',
    youtube: '',
    facebook: '',
  },
};

/** wa.me link, or null when no number is configured. */
export function whatsappLink() {
  if (!SITE.whatsapp) return null;
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(SITE.whatsappMessage)}`;
}

/* ---------------------------------------------------------------- outcomes */
/* `value` is the number the counter animates to; `suffix` stays static while
   it runs. `prefix` carries the rupee sign so it does not get animated. */
export const STATS = [
  { value: 1050, suffix: '+', label: 'Learners placed' },
  { value: 47.6, prefix: '₹', suffix: 'L', label: 'Highest package', decimals: 1 },
  { value: 500, suffix: '+', label: 'Hiring partners' },
  { value: 87, suffix: '%', label: 'Placement rate' },
];

export const OUTCOMES = [
  { value: 1050, suffix: '+', label: 'Total placements' },
  { value: 150, suffix: '+', label: 'Placed at top product firms' },
  { value: 47.6, prefix: '₹', suffix: 'L', label: 'Highest package', decimals: 1 },
  { value: 500, suffix: '+', label: 'Hiring partners' },
];

/* ----------------------------------------------------------------- mentors */
export const MENTORS = [
  { name: 'Balaram', former: 'Ex-TCS · 8 yrs', focus: 'Full stack development. Mentors the web and Java tracks.' },
  { name: 'Kuppola Rajesh', former: 'Ex-AT&T · 6 yrs', focus: 'Python full stack — backend, APIs and deployment.' },
  { name: 'Josna P', former: 'Ex-Infosys · 8 yrs', focus: 'Data analysis. SQL, reporting and analytics workflows.' },
  { name: 'Bharath David', former: '10 yrs experience', focus: 'Data science and machine learning, from fundamentals to deployment.' },
];

/* ----------------------------------------------------------------- stories */
export const STORIES = [
  {
    initials: 'SP', name: 'Sivaprasad', role: 'Software Developer',
    quote: 'I came in from a non-technical degree and finished able to build and deploy an application on my own.',
  },
  {
    initials: 'BP', name: 'Bharath P', role: 'Data Analyst',
    quote: 'The mock interviews were the difference. By the real one I had already answered most of those questions out loud.',
  },
  {
    initials: 'RK', name: 'Raji K', role: 'Data Analyst',
    quote: 'Classes were live and recorded, so missing one for a shift at work never meant falling behind.',
  },
  {
    initials: 'BK', name: 'Bavana K', role: 'Data Scientist',
    quote: 'Not paying tuition up front is what made it possible for me to start at all.',
  },
];

/* --------------------------------------------------------------- companies */
export const COMPANIES = [
  'Infosys', 'TCS', 'Wipro', 'Accenture', 'Deloitte', 'Capgemini',
  'IBM', 'Razorpay', 'PhonePe', 'Flipkart', 'Swiggy', 'EY',
];

/* Scrolling strip under the hero. */
export const PLACEMENTS_TICKER = [
  ['Razorpay', '₹20 LPA'], ['Cred', '₹28 LPA'], ['PhonePe', '₹22 LPA'],
  ['Swiggy', '₹19 LPA'], ['Deloitte', '₹14 LPA'], ['Infosys', '₹9 LPA'],
  ['Flipkart', '₹22 LPA'], ['EY', '₹11 LPA'],
];

/* ----------------------------------------------------------------- process */
/* Pay After Placement genuinely is an ordered sequence — a learner passes each
   stage before the next — which is what earns the numbering. */
export const PROCESS = [
  ['Apply', 'Submit the application form'],
  ['Screening', 'A short call to check the track fits'],
  ['Onboard', 'Join the programme and platform'],
  ['Learn live', 'Live mentor-led training sessions'],
  ['Set up', 'Tools, environment and access'],
  ['Build', 'Daily project work and reviews'],
  ['Get placed', 'Referrals, interviews, then you pay'],
];

/* --------------------------------------------------------------------- faq */
export const FAQ = [
  ['What is Pay After Placement, really?',
   'You pay a small registration fee to start. The remaining tuition is due only after you accept a qualifying job offer. It is not a loan, there is no interest, and no third-party lender is involved.'],
  ['Who is eligible?',
   'Freshers, final-year students, career switchers and early-career professionals. A short screening call decides which track suits you.'],
  ['Do I need prior work experience?',
   'No. Every track starts from fundamentals and pre-course material is provided before classes begin.'],
  ['Is this a 100% job guarantee?',
   'No honest institute can guarantee a job. What is committed is placement support for the stated window — and that you owe no tuition if it does not result in a placement.'],
  ['Are classes live?',
   'Yes, live and mentor-led, with recordings and notes afterwards so a missed class is always recoverable.'],
  ['Can I switch courses after enrolling?',
   'Yes, within the first 30 days, at no additional cost.'],
];

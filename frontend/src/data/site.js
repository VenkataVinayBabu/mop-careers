/*
 * ============================================================================
 *  PUBLIC SITE CONTENT — everything that is not a program.
 * ============================================================================
 *  Same principle as programs.js: shaped like the API rows these will become
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
/*
 * These are now EDITABLE BY AN ADMIN at /admin/website, and what you see below
 * is only the starting point: the values baked into the bundle so the page has
 * something to render on the very first paint.
 *
 * Read the live values with `useSite()` from ./siteSettings — never import
 * SITE_DEFAULTS into a component, or that component will keep showing the
 * built-in copy after an admin has changed it.
 *
 * These MUST match `DEFAULTS` in `backend/app/site_settings.py`. The site
 * paints this copy immediately and swaps in the API's answer a moment later,
 * so any disagreement is a visible flicker on a cold visit. Change one, change
 * the other.
 *
 * A blank value is a real value, not a gap to fill: the UI falls back
 * gracefully rather than rendering a broken link.
 */
export const SITE_DEFAULTS = {
  // Digits only, including country code, e.g. '919890813235'.
  // EMPTY until MOP confirms which number takes WhatsApp — the buttons fall
  // back to the enquiry form rather than opening a chat with nobody. Do not
  // assume it is the phone number below; a landline or a number without
  // WhatsApp installed gives the visitor a dead end.
  whatsapp: '',
  whatsappMessage: "Hi MOP Careers, I'd like to know more about your programs.",

  // Supplied by MOP. Note these differ from what mopcareers.in currently
  // publishes (hello@mopcareers.in, Whitefield) — worth reconciling.
  phone: '+91 98908 13235',
  email: 'hello@mopcareers.com',
  address: 'HSR Layout, Bengaluru — Karnataka 560102',

  announcement: 'Applications open for the next cohort',
  announcementTag: 'Now enrolling',
  // The strip is the one piece of chrome with nothing to fall back to when
  // there is no news, so it gets its own switch rather than relying on an
  // empty message.
  announcementEnabled: true,

  social: {
    linkedin: '',
    instagram: '',
    youtube: '',
    facebook: '',
  },
};

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
/*
 * MENTORS ARE NOW EDITED AT Admin > Website > Mentors, and the database is the
 * source of truth. The list below is only the FIRST PAINT — what the page
 * shows in the moment before the API answers, and all it has to show if the
 * backend is asleep. `useMentors()` in ./siteSettings is what a component
 * should read; this list going stale is expected and harmless.
 *
 * The same rows were seeded into the `mentors` table by the mentors migration,
 * so editing one here does NOT change the site. Edit it in the admin.
 *
 * `programs` lists the slugs a mentor teaches, which is what puts them on that
 * program's page. A mentor can teach several; a program with no matching
 * mentor simply has no mentors section rather than an empty one.
 *
 * THESE ASSIGNMENTS ARE INFERRED from each mentor's stated speciality, not
 * confirmed by MOP. Bala should check them — and the four programs with nobody
 * assigned (Gen AI, Cloud, Cyber Security, Digital Marketing) currently show no
 * mentor at all, which is honest but is also a gap a visitor will notice.
 */
export const MENTORS = [
  /* ---- Real people, from mopcareers.in. Details still unconfirmed. ---- */
  { name: 'Balaram', photo: null, former: 'Ex-TCS · 8 yrs',
    focus: 'Full stack development. Mentors the web and Java tracks.',
    programs: ['full-stack-web-development', 'java-full-stack'] },
  { name: 'Vinay K', photo: null, former: 'Ex-AT&T · 6 yrs',
    focus: 'Python full stack — backend, APIs and deployment.',
    programs: ['python-full-stack', 'full-stack-web-development'] },
  { name: 'Josna P', photo: null, former: 'Ex-Infosys · 8 yrs',
    focus: 'Data analysis. SQL, reporting and analytics workflows.',
    programs: ['data-science-with-ai'] },
  { name: 'Bharath David', photo: null, former: '10 yrs experience',
    focus: 'Data science and machine learning, from fundamentals to deployment.',
    programs: ['data-science-with-ai'] },

  /* ==========================================================================
   *  PLACEHOLDER MENTORS — THESE PEOPLE DO NOT EXIST.
   * ==========================================================================
   *  Invented so every program has someone listed and the layout can be seen
   *  with a realistic number of cards. Each is flagged `placeholder: true`.
   *
   *  This is a heavier fiction than a stock photo: a stock photo is a real
   *  person miscredited, whereas these are fabricated people with fabricated
   *  careers. Publishing them would tell a prospective student that a named
   *  engineer will teach them, when no such engineer exists.
   *
   *  Delete every entry below before this site takes real enrolments, or
   *  replace each with a real mentor. To find them:
   *      grep -n "placeholder: true" src/data/site.js
   * ========================================================================== */
  { name: 'Aarav Menon', photo: null, former: 'Placeholder · 7 yrs', placeholder: true,
    focus: 'Backend and API engineering. Placeholder mentor — replace before launch.',
    programs: ['java-full-stack', 'python-full-stack'] },
  { name: 'Divya Raghavan', photo: null, former: 'Placeholder · 9 yrs', placeholder: true,
    focus: 'LLM applications and retrieval systems. Placeholder mentor — replace before launch.',
    programs: ['gen-ai-agentic-ai'] },
  { name: 'Nikhil Sarma', photo: null, former: 'Placeholder · 6 yrs', placeholder: true,
    focus: 'Agents, evaluation and production AI. Placeholder mentor — replace before launch.',
    programs: ['gen-ai-agentic-ai'] },
  { name: 'Sneha Kulkarni', photo: null, former: 'Placeholder · 8 yrs', placeholder: true,
    focus: 'Cloud architecture and infrastructure as code. Placeholder mentor — replace before launch.',
    programs: ['cloud-computing'] },
  { name: 'Rohit Deshpande', photo: null, former: 'Placeholder · 10 yrs', placeholder: true,
    focus: 'Kubernetes, CI/CD and reliability. Placeholder mentor — replace before launch.',
    programs: ['cloud-computing'] },
  { name: 'Farhan Qureshi', photo: null, former: 'Placeholder · 9 yrs', placeholder: true,
    focus: 'Penetration testing and application security. Placeholder mentor — replace before launch.',
    programs: ['cyber-security'] },
  { name: 'Ananya Iyer', photo: null, former: 'Placeholder · 7 yrs', placeholder: true,
    focus: 'Security operations and incident response. Placeholder mentor — replace before launch.',
    programs: ['cyber-security'] },
  { name: 'Karthik Nair', photo: null, former: 'Placeholder · 8 yrs', placeholder: true,
    focus: 'Performance marketing and paid media. Placeholder mentor — replace before launch.',
    programs: ['digital-marketing-with-ai'] },
  { name: 'Meera Joshi', photo: null, former: 'Placeholder · 6 yrs', placeholder: true,
    focus: 'SEO, content strategy and analytics. Placeholder mentor — replace before launch.',
    programs: ['digital-marketing-with-ai'] },
];

/* ----------------------------------------------------------------- stories */
/* Same as mentors: `photo` stays null until MOP supplies a real portrait AND
   the learner has consented to appear. `initials` is now derived from the
   name, so it cannot drift out of sync. */
export const STORIES = [
  {
    photo: null, name: 'Sivaprasad', role: 'Software Developer',
    quote: 'I came in from a non-technical degree and finished able to build and deploy an application on my own.',
  },
  {
    photo: null, name: 'Bharath P', role: 'Data Analyst',
    quote: 'The mock interviews were the difference. By the real one I had already answered most of those questions out loud.',
  },
  {
    photo: null, name: 'Raji K', role: 'Data Analyst',
    quote: 'Classes were live and recorded, so missing one for a shift at work never meant falling behind.',
  },
  {
    photo: null, name: 'Bavana K', role: 'Data Scientist',
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

/* --------------------------------------------------------- Pay After Placement */
/*
 * This replaced an earlier seven-step "process" strip. Both described the same
 * journey, and two numbered walkthroughs on one page read as padding. These
 * four keep the step that actually matters commercially — you pay at the end —
 * which the operational version buried in the middle.
 *
 * Numbered because it genuinely is a sequence: a learner passes each stage
 * before the next.
 */
export const PAP_EXPLAINER =
  'Simple idea: you learn now, we work with hiring partners to place you, and you pay ' +
  'the tuition only after your first offer. No loans. No interest. If we cannot place ' +
  'you within the programme window, you owe us nothing beyond the small registration fee.';

export const PAP_STEPS = [
  ['Apply & enrol', 'A small registration fee, a short screening call, then onboarding onto the platform.'],
  ['Learn live', 'Months of live classes with a mentor assigned to you, and real project work.'],
  ['Get interview-ready', 'Placement readiness test, mock interviews and referrals into the hiring network.'],
  ['Get placed & pay', 'Tuition becomes payable only once you have accepted your first offer.'],
];

export const PAP_FEATURES = [
  'Live training', 'Industry mentors', '1:1 doubt support', 'Real projects',
  'AI mock interviews', 'ATS resume', 'Placement readiness test', 'Job portal access',
];

/* ---------------------------------------------------------------- referral */
/* The ₹10,000 figure comes from the prototype and has NOT been confirmed by
   MOP. Set `enabled: false` to hide the whole section rather than deleting it. */
export const REFERRAL = {
  enabled: true,
  amount: '₹10,000',
  headline: 'for every friend you refer.',
  body:
    'Refer a candidate to any MOP Careers Pay After Placement programme. When they enrol ' +
    'and start classes, the reward is yours.',
  cta: 'Refer someone',
};

/* =========================================================================
 *  PROGRAM PAGE GLOBALS
 * =========================================================================
 *  Everything below is identical on every program page, so it is written once
 *  here rather than eight times in programs.js. Written naively each program
 *  page needs ~120 pieces of content; pulling out what does not vary brings
 *  the per-program authoring down to roughly 40.
 *
 *  Change one of these and all eight pages update.
 * ========================================================================= */

/* Three-step journey shown on every program page. */
export const ROADMAP = [
  {
    title: 'Upskill',
    body: 'Build job-ready skills with live classes, hands-on projects and an ATS-ready resume.',
    points: ['Real project work', 'ATS resume preparation', 'AI mock interviews'],
  },
  {
    title: 'Placement readiness test',
    body: 'Prove those skills through assignments, case studies and mock interviews with hiring managers.',
    points: ['Technical assignments', 'Live mock interviews', 'Readiness score'],
  },
  {
    title: 'Get hired',
    body: 'Placement support and interview opportunities across the hiring network — then you pay.',
    points: ['Placement support', 'Interview opportunities', 'Referrals'],
  },
];

/* What every learner gets, whichever program they pick. */
export const CAREER_SERVICES = [
  'Hands-on experience with real projects',
  'Unlimited AI and live mock interviews',
  '1:1 career mentor sessions',
  'Career orientation sessions',
  'ATS resume and LinkedIn profile',
  'Placement readiness test',
  'Access to the MOP job portal',
  'Referrals into the hiring partner network',
];

/*
 * Fee structure. These figures come from MOP's own program page and apply to
 * every program until Bala sets them per program from the admin screens.
 *
 * NOT independently verified, and almost certainly not identical across all
 * eight — a marketing program is unlikely to cost the same as a Data Science
 * one. A program can override this by setting `detail.fees`.
 *
 * `was` values render struck through. Set one to null to hide the strike.
 */
export const DEFAULT_FEES = {
  registration: '₹50,000',
  registrationWas: '₹90,000',
  registrationNote: 'Inclusive of taxes · pay to start classes',
  tuition: '₹1,20,000 + GST',
  tuitionWas: '₹1,60,000',
  tuitionNote: 'Payable only after you accept an offer at your agreed CTC. No loans.',
  emi: '₹5,000 / month',
};

/* Shown on every program page, beneath any program-specific questions. */
export const PROGRAM_FAQ = [
  ['Is placement guaranteed?',
   'No. We commit to placement support for the stated window — job alerts, referrals, resume reviews and unlimited mock interviews — and you owe no tuition if it does not result in a placement. Anyone promising a guaranteed job is not being straight with you.'],
  ['Do I need prior programming experience?',
   'No. Every program starts from fundamentals, and pre-course material is provided before classes begin.'],
  ['What is Pay After Placement?',
   'You pay a small registration fee to start. The remaining tuition falls due only after you accept a qualifying offer. It is not a loan, there is no interest, and no third-party lender is involved.'],
  ['Are the classes live or recorded?',
   'Live and mentor-led. Every session is recorded with notes, so a missed class is always recoverable.'],
  ['What support do I get while learning?',
   'A mentor assigned to you for the whole program, 1:1 doubt support between classes, and code review on project work.'],
  ['Can I pause if I get busy, or join a later batch?',
   'Yes. Talk to your mentor and we will move you to the next batch at the same point in the syllabus.'],
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
  ['Can I switch programs after enrolling?',
   'Yes, within the first 30 days, at no additional cost.'],
];

/*
 * ============================================================================
 *  COURSE CATALOGUE
 * ============================================================================
 *  This is the public site's course list. Editing this file and pushing is
 *  currently the only way to change it.
 *
 *  SHAPE MATTERS. Every object here is deliberately shaped like the row the
 *  API will return once courses move into the database and Bala manages them
 *  from an admin form. Keeping the shape identical means the swap is a change
 *  of import, not a rewrite of the pages. If you add a field here, add it in
 *  the same shape you would want it on the server.
 *
 *  `published: false` hides a course from the site completely — it will not
 *  appear in the listing, the enquiry dropdown, or any count.
 *
 *  ---------------------------------------------------------------------------
 *  CONTENT WARNING: not all of this is confirmed.
 *
 *  Six of these eight appear on MOP's own live site (mopcareers.in) or in the
 *  prototype Bala supplied. Cloud Computing and Cyber Security appear ONLY in
 *  the prototype — they are not on mopcareers.in and MOP has not confirmed it
 *  runs them. They are flagged `confirmed: false`. If MOP does not actually
 *  teach them, set `published: false` on those two and nothing else changes.
 *
 *  CTC figures are indicative and have not been verified against offer letters.
 * ============================================================================
 */

export const COURSES = [
  {
    slug: 'data-science-with-ai',
    name: 'Data Science with AI',
    category: 'ai',
    badge: 'Most popular',
    featured: true,
    confirmed: true,
    published: true,
    duration: '6–12 months',
    ctcAvg: '₹12 LPA avg',
    ctcHigh: '₹42 LPA highest',
    summary:
      'Python, machine learning, deep learning and MLOps — finishing job-ready with a capstone you can walk an interviewer through line by line.',
    skills: ['Python', 'ML', 'Deep Learning', 'MLOps'],
    forWhom: 'Graduates and career switchers moving into data and AI roles.',
  },
  {
    slug: 'gen-ai-agentic-ai',
    name: 'Gen AI, Agent AI & Agentic AI',
    category: 'ai',
    badge: 'New',
    featured: true,
    confirmed: true,
    published: true,
    duration: '6–9 months',
    ctcAvg: '₹18 LPA avg',
    ctcHigh: '₹45 LPA highest',
    summary:
      'Large language models, retrieval over your own data, evaluation and multi-agent systems — the frontier of AI hiring.',
    skills: ['LLMs', 'RAG', 'LangGraph', 'Evals'],
    forWhom: 'Developers and analysts who want to build AI products, not just use them.',
  },
  {
    slug: 'full-stack-web-development',
    name: 'Full Stack Web Development',
    category: 'dev',
    featured: false,
    confirmed: true,
    published: true,
    duration: '6–12 months',
    ctcAvg: '₹10 LPA avg',
    ctcHigh: null,
    summary:
      'Front end, back end, database and deployment — the whole path from a blank editor to a running application.',
    skills: ['React', 'Next.js', 'Node.js', 'MongoDB'],
    forWhom: 'Freshers and switchers targeting product and startup engineering roles.',
  },
  {
    slug: 'java-full-stack',
    name: 'Java Full Stack',
    category: 'dev',
    featured: false,
    confirmed: true,
    published: true,
    duration: '6–12 months',
    ctcAvg: '₹9 LPA avg',
    ctcHigh: null,
    summary:
      'Core Java and Spring Boot with a modern front end — the stack the large services companies hire on.',
    skills: ['Java', 'Spring Boot', 'React', 'Microservices'],
    forWhom: 'Freshers targeting enterprise and services-company roles.',
  },
  {
    slug: 'python-full-stack',
    name: 'Python Full Stack',
    category: 'dev',
    featured: false,
    confirmed: true,
    published: true,
    duration: '6–12 months',
    ctcAvg: '₹10 LPA avg',
    ctcHigh: null,
    summary:
      'Python, relational databases, API development and a React front end, finishing on a capstone project.',
    skills: ['Python', 'FastAPI', 'React', 'PostgreSQL'],
    forWhom: 'Beginners with no prior programming experience.',
  },
  {
    // NOT on mopcareers.in — prototype only. Confirm before relying on this.
    slug: 'cloud-computing',
    name: 'Cloud Computing',
    category: 'infra',
    featured: false,
    confirmed: false,
    published: true,
    duration: '6–9 months',
    ctcAvg: '₹11 LPA avg',
    ctcHigh: null,
    summary:
      'Deploying and running systems on the major cloud platforms, with containers and infrastructure as code.',
    skills: ['AWS', 'Azure', 'Kubernetes', 'Terraform'],
    forWhom: 'Anyone moving into cloud, DevOps or platform engineering.',
  },
  {
    // NOT on mopcareers.in — prototype only. Confirm before relying on this.
    slug: 'cyber-security',
    name: 'Cyber Security',
    category: 'infra',
    featured: false,
    confirmed: false,
    published: true,
    duration: '6–10 months',
    ctcAvg: '₹9 LPA avg',
    ctcHigh: null,
    summary:
      'Penetration testing, security operations and the certification groundwork employers screen for.',
    skills: ['Pentesting', 'SOC', 'SIEM', 'Networking'],
    forWhom: 'Freshers and IT staff moving into security roles.',
  },
  {
    slug: 'digital-marketing-with-ai',
    name: 'Digital Marketing with AI',
    category: 'mkt',
    featured: false,
    confirmed: true,
    published: true,
    duration: '6–9 months',
    ctcAvg: '₹7 LPA avg',
    ctcHigh: null,
    summary:
      'Search, paid media and analytics, with AI tooling used through the whole content and reporting workflow.',
    skills: ['SEO', 'Google Ads', 'Meta Ads', 'Analytics'],
    forWhom: 'Non-technical graduates who want a route into tech companies.',
  },
];

/** Only these ever reach a visitor. Everything on the site counts from here. */
export const LIVE_COURSES = COURSES.filter((c) => c.published);

export const FEATURED_COURSES = LIVE_COURSES.filter((c) => c.featured);
export const OTHER_COURSES = LIVE_COURSES.filter((c) => !c.featured);

export const CATEGORIES = [
  { id: 'all', label: 'All courses' },
  { id: 'ai', label: 'Data & AI' },
  { id: 'dev', label: 'Development' },
  { id: 'infra', label: 'Cloud & Security' },
  { id: 'mkt', label: 'Marketing' },
];

/* The enquiry form's dropdown. `programme` crosses the API as free text, so
   this list can change without a migration. */
export const COURSE_OPTIONS = [
  ...LIVE_COURSES.map((c) => ({ value: c.name, label: c.name })),
  { value: 'Not sure yet', label: 'Not sure yet' },
];

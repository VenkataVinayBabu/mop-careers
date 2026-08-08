/*
 * ============================================================================
 *  PROGRAM CATALOGUE
 * ============================================================================
 *  This is the public site's program list. Editing this file and pushing is
 *  currently the only way to change it.
 *
 *  SHAPE MATTERS. Every object here is deliberately shaped like the row the
 *  API will return once programs move into the database and Bala manages them
 *  from an admin form. Keeping the shape identical means the swap is a change
 *  of import, not a rewrite of the pages. If you add a field here, add it in
 *  the same shape you would want it on the server.
 *
 *  `published: false` hides a program from the site completely — it will not
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

export const PROGRAMS = [
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

    /*
     * Everything the program's own page renders. Every field is OPTIONAL — a
     * section whose data is missing does not render at all, so a program can
     * be published with nothing but the basics above and filled in over time
     * without ever looking half-built.
     *
     * Shaped like the API row this becomes once Bala manages programs from
     * the admin screens, so that swap is an import change, not a rewrite.
     */
    detail: {
      headline: 'Become a job-ready Data Scientist, and pay after you are placed.',
      intro:
        'A live, mentor-led program for freshers and career switchers moving into data and AI. ' +
        'Python and statistics through machine learning and deep learning to production MLOps — ' +
        'finishing with capstones you can walk an interviewer through line by line.',
      highlights: [
        'Pay a small registration fee and start learning.',
        'The rest of the tuition is due only after you are placed.',
        'Master Python, ML, deep learning, generative AI and MLOps.',
      ],

      why: [
        { title: 'Modern data science stack',
          body: 'Python, Pandas, NumPy, scikit-learn, PyTorch and TensorFlow — the tools every data team actually asks for.' },
        { title: 'Generative AI and LLMs',
          body: 'Retrieval over your own data, vector databases and evaluation — shipping real AI features, not toy notebooks.' },
        { title: 'Machine and deep learning',
          body: 'Regression, trees, ensembles, CNNs and transformers, end to end on real datasets rather than tidy examples.' },
        { title: '1:1 mentorship',
          body: 'A mentor assigned to you for the whole program, with weekly time set aside for your work specifically.' },
        { title: 'Real project review',
          body: 'Your code is read and critiqued every week. That feedback loop is what separates a course from a portfolio.' },
        { title: 'Career tooling',
          body: 'ATS resume scoring, LinkedIn review and unlimited mock interviews tuned to data science hiring rounds.' },
      ],

      roles: [
        { title: 'Data Scientist', salary: '₹8L – ₹18L',
          body: 'Builds models that answer business questions — churn, ranking, forecasting, personalisation.',
          companies: ['Flipkart', 'Amazon', 'Swiggy', 'Meesho'] },
        { title: 'ML Engineer', salary: '₹10L – ₹22L',
          body: 'Takes models to production — pipelines, serving, monitoring and drift detection at scale.',
          companies: ['Razorpay', 'Cred', 'PhonePe', 'Uber'] },
        { title: 'AI / GenAI Engineer', salary: '₹12L – ₹28L',
          body: 'Builds LLM-powered products — retrieval, agents, fine-tuning, evaluation and prompt design.',
          companies: ['Microsoft', 'Adobe', 'Freshworks'] },
        { title: 'Applied Scientist', salary: '₹18L – ₹42L',
          body: 'Sits between research and engineering — designs novel models and ships them.',
          companies: ['Amazon', 'Meta', 'Netflix', 'Google'] },
      ],

      /*
       * Phases are labelled "Phase 1..4" and carry no month. The reference
       * pinned them to JAN/APR/JUL/OCT, which only holds if there is one
       * intake a year — someone joining in May would be told they are
       * starting "Phase 1 · JAN". Dates get added per batch later.
       *
       * `exit` is the Placements Exit: the calibre of employer a learner is
       * ready for at the end of that phase. It rises through the program,
       * which is a far better argument than "finish and hope".
       */
      syllabus: [
        { title: 'Python, SQL and statistics foundations',
          body: 'The bedrock. Every hiring round for a data role tests these first, whatever else is on your CV.',
          topics: ['Python', 'Pandas', 'NumPy', 'SQL', 'Window functions', 'Statistics', 'Probability', 'Hypothesis testing'],
          exit: ['TCS', 'Infosys', 'Capgemini', 'Cognizant', 'Accenture', 'Deloitte'] },
        { title: 'Machine learning and data storytelling',
          body: 'End-to-end ML pipelines — regression, classification, ensembles and explainability — plus how to present results to people who are not analysts.',
          topics: ['scikit-learn', 'XGBoost', 'LightGBM', 'SHAP', 'Feature engineering', 'A/B testing', 'Tableau', 'Power BI'],
          exit: ['PhonePe', 'Swiggy', 'Razorpay', 'Paytm', 'Flipkart', 'Amazon'] },
        { title: 'Deep learning and generative AI',
          body: 'Neural networks from first principles through transformers to LLMs, then production retrieval applications and agentic workflows.',
          topics: ['PyTorch', 'TensorFlow', 'Hugging Face', 'Transformers', 'LangChain', 'RAG', 'Vector DBs', 'Fine-tuning'],
          exit: ['Microsoft', 'Adobe', 'Cred', 'Freshworks', 'Groww', 'Dream11'] },
        { title: 'MLOps and capstone projects',
          body: 'Deployment with CI/CD, monitoring and drift detection, two capstones, and mock interviews with hiring managers.',
          topics: ['Docker', 'FastAPI', 'MLflow', 'SageMaker', 'CI/CD', 'Capstones', 'Mock interviews', 'Portfolio'],
          exit: ['Google', 'Meta', 'Amazon', 'Netflix', 'Uber'] },
      ],

      technologies: [
        'Python', 'SQL', 'Pandas', 'NumPy', 'scikit-learn', 'XGBoost', 'PyTorch', 'TensorFlow',
        'Hugging Face', 'LangChain', 'MLflow', 'Docker', 'FastAPI', 'AWS', 'GCP', 'SageMaker',
        'Airflow', 'Spark', 'Tableau', 'Power BI', 'Git', 'Jupyter', 'Streamlit',
      ],

      projects: [
        { title: 'Credit risk scoring and fraud detection',
          body: 'Score loan applications for a lending startup, deploy it as a real-time API, and monitor for drift over three months.',
          tech: ['Python', 'XGBoost', 'SHAP', 'FastAPI'] },
        { title: 'Demand forecasting across 12,000 SKUs',
          body: 'Forecast weekly demand for a retail chain, then present the result as something an operations team can act on.',
          tech: ['LightGBM', 'Time series', 'SQL', 'Tableau'] },
        { title: 'Medical image triage',
          body: 'Fine-tune a vision model to classify chest X-rays, with explainability output for clinical review.',
          tech: ['PyTorch', 'CNNs', 'Grad-CAM', 'Streamlit'] },
        { title: 'AI research assistant with retrieval',
          body: 'An assistant that searches a large document set, cites its sources, and evaluates its own answers.',
          tech: ['LangChain', 'Vector DB', 'RAG', 'Evals'] },
      ],

      faq: [
        ['How much maths do I need?',
         'School-level algebra is enough to start. The statistics you need is taught in phase one, from the beginning.'],
        ['Will I build a portfolio?',
         'Yes — four guided projects plus two capstones, all reviewed. That portfolio is what you take into interviews.'],
      ],
    },
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
    // 'Microservices' is long enough to wrap this row onto two lines, which
    // pushed the card's arrow onto a line of its own. MySQL is shorter, and
    // the database belongs in a full stack list anyway.
    skills: ['Java', 'Spring Boot', 'React', 'MySQL'],
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
      'Penetration testing, security operations and incident response, plus the certification groundwork employers screen for.',
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

/*
 * Only Data Science with AI has a populated `detail` block so far. The other
 * seven render a program page built from the fields above plus every global
 * section, which is a complete page — just without a syllabus, projects or
 * role breakdown until that content exists. Nothing looks broken in between.
 */

/** Look a program up by its URL slug. Returns undefined for an unknown slug. */
export const programBySlug = (slug) => PROGRAMS.find((p) => p.slug === slug && p.published);

/** Only these ever reach a visitor. Everything on the site counts from here. */
export const LIVE_PROGRAMS = PROGRAMS.filter((c) => c.published);

export const FEATURED_PROGRAMS = LIVE_PROGRAMS.filter((c) => c.featured);
export const OTHER_PROGRAMS = LIVE_PROGRAMS.filter((c) => !c.featured);

export const CATEGORIES = [
  { id: 'all', label: 'All programs' },
  { id: 'ai', label: 'Data & AI' },
  { id: 'dev', label: 'Development' },
  { id: 'infra', label: 'Cloud & Security' },
  { id: 'mkt', label: 'Marketing' },
];

/* The enquiry form's dropdown. `programme` crosses the API as free text, so
   this list can change without a migration. */
export const PROGRAM_OPTIONS = [
  ...LIVE_PROGRAMS.map((c) => ({ value: c.name, label: c.name })),
  { value: 'Not sure yet', label: 'Not sure yet' },
];

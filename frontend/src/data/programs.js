/*
 * ============================================================================
 *  PROGRAM CATALOGUE
 * ============================================================================
 *  PROGRAMS ARE NOW EDITED AT Admin > Website > Programs, and the database is
 *  the source of truth. This list is only the FIRST PAINT — what the site
 *  shows in the moment before the API answers, and all it has to show if the
 *  backend is asleep. `usePrograms()` in ./siteSettings is what a component
 *  should read; this list going stale is expected and harmless.
 *
 *  The same rows were seeded into the `programs` table by the programs
 *  migration, so editing one here does NOT change the site. Edit it in the
 *  admin.
 *
 *  The shape below is exactly the shape the API returns (bar snake_case on the
 *  flat fields, mapped in siteSettings), which is what made that swap a change
 *  of import rather than a rewrite of the pages.
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
 *
 *  ---------------------------------------------------------------------------
 *  WHERE THE `detail` CONTENT CAME FROM
 *
 *  Data Science with AI was adapted from MOP's own prototype page.
 *
 *  The other seven were WRITTEN FROM SCRATCH as a working draft — syllabus
 *  phases, projects, role descriptions, salary bands and exit companies. They
 *  are plausible and industry-standard for each subject, but they are NOT
 *  MOP's curriculum and nobody at MOP has approved a word of them.
 *
 *  Treat every one as a first draft to be corrected, in particular:
 *    - salary bands, which are market estimates rather than MOP's placements
 *    - Placements Exit company lists, which are the strongest claim on the
 *      page and are drawn from the site's existing hiring-network names
 *    - certification claims (AWS SAA, CEH, Security+) — confirm MOP prepares
 *      learners for these before the pages stay up
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

    detail: {
      headline: 'Build with large language models, and pay after you are placed.',
      intro:
        'The frontier track. Prompting and retrieval through evaluation to multi-agent systems — ' +
        'shipping AI features that hold up in production rather than demos that work once.',
      highlights: [
        'Pay a small registration fee and start learning.',
        'The rest of the tuition is due only after you are placed.',
        'Build retrieval systems, agents and evaluation harnesses.',
      ],
      why: [
        { title: 'Beyond prompt engineering',
          body: 'Prompting is one lesson, not a career. The work is retrieval, evaluation, cost control and knowing when a model is the wrong tool.' },
        { title: 'Retrieval over real data',
          body: 'Chunking, embeddings, hybrid search and reranking on messy documents — not a tidy demo corpus that flatters the results.' },
        { title: 'Agents that do work',
          body: 'Tool use, planning and recovery from failure, with the guardrails that stop an agent looping or spending money it should not.' },
        { title: 'Evaluation you can defend',
          body: 'How to prove a change made the system better. Most AI projects stall here, which is why it is taught properly.' },
        { title: 'Production concerns',
          body: 'Latency, token cost, caching, fallbacks and what happens when the provider has an outage mid-request.' },
        { title: 'Python that holds up',
          body: 'The engineering underneath — typing, testing and structure — so what you build survives someone else reading it.' },
      ],
      roles: [
        { title: 'AI Engineer', salary: '₹8L – ₹22L',
          body: 'Builds LLM-backed features into products — retrieval, prompting, evaluation and the plumbing around them.',
          companies: ['Razorpay', 'PhonePe', 'Freshworks'] },
        { title: 'GenAI Application Developer', salary: '₹7L – ₹18L',
          body: 'Ships user-facing AI features: assistants, summarisation, search over a company’s own content.',
          companies: ['Infosys', 'Accenture', 'IBM'] },
        { title: 'ML / LLM Ops Engineer', salary: '₹10L – ₹24L',
          body: 'Runs models in production — serving, cost, caching, monitoring and quality regression.',
          companies: ['Flipkart', 'Swiggy', 'Cred'] },
        { title: 'AI Solutions Consultant', salary: '₹9L – ₹20L',
          body: 'Works with clients to find where AI genuinely helps, then scopes and builds it.',
          companies: ['Deloitte', 'Capgemini', 'EY'] },
      ],
      syllabus: [
        { title: 'Python and LLM fundamentals',
          body: 'The engineering base, then how these models actually behave — tokens, context, temperature and where they fail.',
          topics: ['Python', 'APIs', 'Tokens & context', 'Prompt design', 'Structured output', 'Cost basics'],
          exit: ['Infosys', 'TCS', 'Wipro', 'Capgemini'] },
        { title: 'Retrieval over your own data',
          body: 'Chunking, embeddings, vector search, hybrid retrieval and reranking — the part that decides whether answers are any good.',
          topics: ['Embeddings', 'Vector DBs', 'Chunking', 'Hybrid search', 'Reranking', 'Citations'],
          exit: ['Accenture', 'IBM', 'Deloitte', 'EY'] },
        { title: 'Agents and tool use',
          body: 'Planning, tool calling, memory and recovery — plus the guardrails that keep an agent from looping or overspending.',
          topics: ['Tool calling', 'Planning', 'Multi-agent', 'Memory', 'Guardrails', 'Tracing'],
          exit: ['Razorpay', 'PhonePe', 'Freshworks'] },
        { title: 'Evaluation and production',
          body: 'Building an evaluation harness, then deploying with caching, fallbacks and monitoring so quality does not quietly degrade.',
          topics: ['Evals', 'Regression testing', 'Caching', 'Latency', 'Monitoring', 'Capstone'],
          exit: ['Flipkart', 'Swiggy', 'Cred'] },
      ],
      technologies: [
        'Python', 'OpenAI API', 'Anthropic API', 'LangChain', 'LangGraph', 'LlamaIndex',
        'Hugging Face', 'Embeddings', 'Vector DBs', 'FastAPI', 'Docker', 'Redis',
        'Streamlit', 'Git', 'Postgres', 'Evals',
      ],
      projects: [
        { title: 'Assistant over a company knowledge base',
          body: 'Retrieval across thousands of documents that cites its sources and admits when it does not know.',
          tech: ['RAG', 'Vector DB', 'FastAPI'] },
        { title: 'Multi-step research agent',
          body: 'An agent that plans, uses tools, recovers from failures and reports what it did and why.',
          tech: ['Agents', 'Tool calling', 'Tracing'] },
        { title: 'Evaluation harness',
          body: 'A test suite for an AI feature, so you can prove a prompt or model change actually improved it.',
          tech: ['Evals', 'Datasets', 'CI'] },
        { title: 'Production AI feature',
          body: 'A user-facing feature with caching, cost limits, fallbacks and monitoring — deployed and measured.',
          tech: ['Docker', 'Redis', 'Monitoring'] },
      ],
      faq: [
        ['Do I need machine learning experience?',
         'No. This track builds on top of existing models rather than training them from scratch. Comfortable Python is what matters.'],
        ['Will this be out of date in a year?',
         'The specific model names change constantly. Retrieval, evaluation and production discipline do not, which is why the syllabus is weighted towards those.'],
      ],
    },
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

    detail: {
      headline: 'Build and ship complete web applications, and pay after you are placed.',
      intro:
        'From a blank editor to a running application on the internet. Front end, back end, ' +
        'database and deployment — the whole path, taught in the order you would actually build it.',
      highlights: [
        'Pay a small registration fee and start learning.',
        'The rest of the tuition is due only after you are placed.',
        'Finish with applications running in production, not on your laptop.',
      ],
      why: [
        { title: 'The whole stack, in order',
          body: 'Interface, server, database and deployment taught as one path, so you always know how the piece in front of you connects to the rest.' },
        { title: 'JavaScript properly',
          body: 'The language before the framework. Async, modules and the browser — so React makes sense instead of being memorised.' },
        { title: 'Real databases',
          body: 'Schema design, relationships, indexes and the queries behind them. The part bootcamps skip and interviewers test.' },
        { title: 'Deployment from week one',
          body: 'Your work is on the internet early and stays there. "It runs on my machine" is not a portfolio.' },
        { title: 'Code review every week',
          body: 'A mentor reads your code and tells you what is wrong with it. That loop is what turns exercises into ability.' },
        { title: 'AI as a tool, not a crutch',
          body: 'Using copilots the way working engineers do, including knowing when the suggestion is wrong.' },
      ],
      roles: [
        { title: 'Full Stack Developer', salary: '₹5L – ₹14L',
          body: 'Builds features end to end — interface through API to database — and owns them in production.',
          companies: ['Razorpay', 'Swiggy', 'Flipkart'] },
        { title: 'Frontend Developer', salary: '₹4L – ₹12L',
          body: 'Builds the interface: components, state, performance and the accessibility that makes it usable.',
          companies: ['PhonePe', 'Freshworks', 'Infosys'] },
        { title: 'Backend Developer', salary: '₹5L – ₹15L',
          body: 'APIs, data models, authentication and the reliability work behind them.',
          companies: ['Cred', 'Razorpay', 'IBM'] },
        { title: 'Software Engineer (Graduate)', salary: '₹4L – ₹9L',
          body: 'Graduate engineering intake at a services or product firm, working across whatever the team needs.',
          companies: ['TCS', 'Infosys', 'Accenture', 'Capgemini'] },
      ],
      syllabus: [
        { title: 'Web foundations and JavaScript',
          body: 'HTML, CSS and the language itself. Layout, the DOM, async and modules — the ground everything else stands on.',
          topics: ['HTML', 'CSS', 'Flexbox & Grid', 'JavaScript', 'Async', 'Git'],
          exit: ['TCS', 'Infosys', 'Wipro', 'Capgemini'] },
        { title: 'React and modern front end',
          body: 'Components, state, routing and data fetching, plus how to keep an interface fast as it grows.',
          topics: ['React', 'Hooks', 'Routing', 'State', 'Tailwind', 'Forms'],
          exit: ['Accenture', 'IBM', 'Deloitte'] },
        { title: 'Back end and databases',
          body: 'Node and Express, REST APIs, authentication, and schema design in both relational and document databases.',
          topics: ['Node.js', 'Express', 'REST', 'Auth', 'MongoDB', 'SQL'],
          exit: ['Freshworks', 'PhonePe', 'Razorpay'] },
        { title: 'Deployment and capstone',
          body: 'Testing, environments, CI and deployment, then a capstone taken all the way to a live URL with real users.',
          topics: ['Testing', 'CI/CD', 'Docker', 'Cloud deploy', 'Monitoring', 'Capstone'],
          exit: ['Swiggy', 'Flipkart', 'Cred'] },
      ],
      technologies: [
        'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Tailwind',
        'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'REST', 'Git', 'Docker',
        'Jest', 'Vite', 'Vercel', 'CI/CD',
      ],
      projects: [
        { title: 'Multi-user application with authentication',
          body: 'Sign-up, sessions, roles and permissions done properly — the foundation almost every product needs.',
          tech: ['React', 'Node.js', 'JWT'] },
        { title: 'Data-driven dashboard',
          body: 'A dashboard over a real dataset with filtering, pagination and charts that stay fast as data grows.',
          tech: ['React', 'SQL', 'Charts'] },
        { title: 'API-backed marketplace',
          body: 'Listings, search, cart and checkout flow, with a schema that survives the awkward cases.',
          tech: ['Express', 'MongoDB', 'REST'] },
        { title: 'Deployed capstone',
          body: 'Your own application, on the internet, with CI, monitoring and a README someone else could follow.',
          tech: ['Docker', 'CI/CD', 'Cloud'] },
      ],
      faq: [
        ['Do I need to know how to code already?',
         'No. The first phase starts from HTML and the fundamentals of the language, assuming nothing.'],
        ['React or Next.js?',
         'Both. React first so you understand what is happening, then Next.js for routing, rendering and deployment.'],
      ],
    },
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

    detail: {
      headline: 'Learn the stack enterprises hire on, and pay after you are placed.',
      intro:
        'Core Java through Spring Boot to a modern front end. This is the stack the large ' +
        'services and product companies recruit into in volume, and the one their interviews test.',
      highlights: [
        'Pay a small registration fee and start learning.',
        'The rest of the tuition is due only after you are placed.',
        'Core Java, Spring Boot, SQL and a React front end.',
      ],
      why: [
        { title: 'Java taught properly',
          body: 'Collections, streams, generics and exceptions — not a syntax tour. This is what the first interview round is about.' },
        { title: 'Spring Boot in depth',
          body: 'Dependency injection, REST, validation, transactions and security, built up rather than copied from a starter template.' },
        { title: 'Databases and JPA',
          body: 'Schema design and SQL first, then Hibernate — so you can tell when the ORM is generating something expensive.' },
        { title: 'The largest hiring pool',
          body: 'Java remains the highest-volume graduate intake in Indian IT services. More doors, and more predictable interviews.' },
        { title: 'Testing and code review',
          body: 'JUnit, Mockito and weekly review. Enterprise teams care about tests, and interviews increasingly ask.' },
        { title: 'A front end too',
          body: 'Enough React to build and ship the interface yourself, which is what "full stack" means on a real team.' },
      ],
      roles: [
        { title: 'Java Backend Developer', salary: '₹4L – ₹12L',
          body: 'Builds and maintains Spring Boot services — APIs, data access, business logic.',
          companies: ['TCS', 'Infosys', 'Capgemini', 'Accenture'] },
        { title: 'Java Full Stack Developer', salary: '₹5L – ₹14L',
          body: 'Owns features from the React interface through to the database.',
          companies: ['Deloitte', 'IBM', 'Wipro'] },
        { title: 'Software Engineer (Graduate)', salary: '₹4L – ₹9L',
          body: 'Graduate intake, rotating across teams while you find your footing.',
          companies: ['TCS', 'Infosys', 'Wipro', 'Capgemini'] },
        { title: 'Backend Engineer (Product)', salary: '₹8L – ₹20L',
          body: 'Services at a product company, where scale and reliability matter more than ticket volume.',
          companies: ['PhonePe', 'Razorpay', 'Flipkart'] },
      ],
      syllabus: [
        { title: 'Core Java and problem solving',
          body: 'The language and the standard library, plus the data structures every screening round covers.',
          topics: ['Java', 'OOP', 'Collections', 'Streams', 'Exceptions', 'DSA basics'],
          exit: ['TCS', 'Infosys', 'Wipro', 'Capgemini'] },
        { title: 'Databases and JPA',
          body: 'SQL and schema design first, then Hibernate and JPA — including what the ORM is doing underneath.',
          topics: ['SQL', 'Schema design', 'Joins', 'Indexes', 'JPA', 'Hibernate'],
          exit: ['Accenture', 'IBM', 'Deloitte'] },
        { title: 'Spring Boot and REST',
          body: 'Building real services — dependency injection, REST APIs, validation, transactions, security and testing.',
          topics: ['Spring Boot', 'REST', 'Spring Security', 'Validation', 'JUnit', 'Mockito'],
          exit: ['Deloitte', 'EY', 'Freshworks'] },
        { title: 'Front end, deployment and capstone',
          body: 'React against your own APIs, then containerised deployment with CI and a full capstone.',
          topics: ['React', 'REST clients', 'Docker', 'CI/CD', 'Cloud deploy', 'Capstone'],
          exit: ['PhonePe', 'Razorpay', 'Flipkart'] },
      ],
      technologies: [
        'Java', 'Spring Boot', 'Spring Security', 'JPA', 'Hibernate', 'Maven',
        'PostgreSQL', 'MySQL', 'REST', 'JUnit', 'Mockito', 'React',
        'Docker', 'Git', 'CI/CD', 'Postman',
      ],
      projects: [
        { title: 'Banking-style transaction service',
          body: 'Accounts, transfers and statements with transactions done correctly — the classic enterprise problem.',
          tech: ['Spring Boot', 'JPA', 'PostgreSQL'] },
        { title: 'Secured REST API',
          body: 'Authentication, roles and permissions with Spring Security, and the tests that prove it holds.',
          tech: ['Spring Security', 'JWT', 'JUnit'] },
        { title: 'Inventory management system',
          body: 'A full CRUD system with reporting, over a schema designed to survive real-world edge cases.',
          tech: ['Spring Boot', 'SQL', 'React'] },
        { title: 'Deployed full stack capstone',
          body: 'React front end on your own Spring Boot API, containerised and running in the cloud.',
          tech: ['React', 'Docker', 'CI/CD'] },
      ],
      faq: [
        ['Is Java still worth learning?',
         'For getting hired in India, yes. It remains the largest graduate intake across the services companies, and those interviews are predictable in a way that helps a first job.'],
        ['How much DSA is included?',
         'Enough for the screening rounds these employers actually set — arrays, strings, maps, sorting and complexity — taught alongside the language rather than as a separate grind.'],
      ],
    },
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

    detail: {
      headline: 'Start from zero and finish shipping software, paying after you are placed.',
      intro:
        'The gentlest entry point. Python from the first line, then databases, APIs with FastAPI ' +
        'and a React front end — ending with an application you built and deployed yourself.',
      highlights: [
        'Pay a small registration fee and start learning.',
        'The rest of the tuition is due only after you are placed.',
        'No prior programming experience assumed, at all.',
      ],
      why: [
        { title: 'Genuinely from zero',
          body: 'The first phase assumes you have never written code. Nobody is expected to quietly catch up in the evenings.' },
        { title: 'Python is the kindest start',
          body: 'Readable syntax means you spend your attention on how to think about problems, not on semicolons.' },
        { title: 'Databases early',
          body: 'SQL and schema design before frameworks, so data modelling becomes a strength rather than a gap.' },
        { title: 'FastAPI for real APIs',
          body: 'Typed, documented, testable services — the modern Python backend rather than a toy tutorial server.' },
        { title: 'A front end you can build',
          body: 'Enough React to put an interface on your own API, so you can ship something whole and demonstrable.' },
        { title: 'Weekly code review',
          body: 'Someone experienced reads your code every week and tells you plainly what to fix.' },
      ],
      roles: [
        { title: 'Python Developer', salary: '₹4L – ₹11L',
          body: 'Builds services, automation and data tooling in Python.',
          companies: ['Infosys', 'Capgemini', 'IBM'] },
        { title: 'Backend Developer', salary: '₹5L – ₹14L',
          body: 'APIs, data models and the reliability work behind a product.',
          companies: ['Razorpay', 'Freshworks', 'PhonePe'] },
        { title: 'Full Stack Developer', salary: '₹5L – ₹13L',
          body: 'Owns features from the interface through to the database.',
          companies: ['Swiggy', 'Flipkart', 'Cred'] },
        { title: 'Software Engineer (Graduate)', salary: '₹4L – ₹9L',
          body: 'Graduate engineering intake, working across whatever the team needs.',
          companies: ['TCS', 'Infosys', 'Wipro', 'Accenture'] },
      ],
      syllabus: [
        { title: 'Python from the beginning',
          body: 'Variables through functions, files and error handling. Every concept applied immediately rather than left abstract.',
          topics: ['Python', 'Data types', 'Loops', 'Functions', 'Files', 'Git'],
          exit: ['TCS', 'Infosys', 'Wipro'] },
        { title: 'Object orientation and databases',
          body: 'Classes and modules, then SQL, schema design and the queries you will be asked about in interviews.',
          topics: ['OOP', 'Modules', 'SQL', 'PostgreSQL', 'Schema design', 'Joins'],
          exit: ['Capgemini', 'Accenture', 'IBM'] },
        { title: 'APIs with FastAPI',
          body: 'REST services with validation, authentication and tests — properly typed and documented.',
          topics: ['FastAPI', 'REST', 'Pydantic', 'Auth', 'SQLAlchemy', 'Pytest'],
          exit: ['Freshworks', 'Razorpay', 'Deloitte'] },
        { title: 'Front end, deployment and capstone',
          body: 'React against your own API, then deployment with CI and a capstone taken all the way to a live URL.',
          topics: ['React', 'Tailwind', 'Docker', 'CI/CD', 'Cloud deploy', 'Capstone'],
          exit: ['Swiggy', 'PhonePe', 'Flipkart'] },
      ],
      technologies: [
        'Python', 'FastAPI', 'SQLAlchemy', 'Pydantic', 'PostgreSQL', 'SQL',
        'Pytest', 'React', 'Tailwind', 'REST', 'Git', 'Docker',
        'CI/CD', 'Postman', 'Alembic',
      ],
      projects: [
        { title: 'Command-line tool',
          body: 'Your first real program — reads files, handles bad input without crashing, and does something useful.',
          tech: ['Python', 'Files', 'Testing'] },
        { title: 'REST API with authentication',
          body: 'A documented, tested API with sign-up, login and role-based access.',
          tech: ['FastAPI', 'PostgreSQL', 'JWT'] },
        { title: 'Full stack application',
          body: 'React interface over your own API, with the data model designed before the code.',
          tech: ['React', 'FastAPI', 'SQL'] },
        { title: 'Deployed capstone',
          body: 'Everything together, containerised, running in the cloud with CI and monitoring.',
          tech: ['Docker', 'CI/CD', 'Cloud'] },
      ],
      faq: [
        ['I have never written a line of code. Is that fine?',
         'Yes — this is the program designed for exactly that. Phase one assumes nothing, and pre-course material is sent before classes begin.'],
        ['Python or Java for a first job?',
         'Java has more graduate openings at the large services firms; Python opens more product, backend and data roles. A screening call will help you pick.'],
      ],
    },
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

    detail: {
      headline: 'Run systems in the cloud, and pay after you are placed.',
      intro:
        'Linux and networking through AWS and Azure to containers, CI/CD and infrastructure as ' +
        'code — the work of keeping software running once someone else has written it.',
      highlights: [
        'Pay a small registration fee and start learning.',
        'The rest of the tuition is due only after you are placed.',
        'AWS and Azure, Docker, Kubernetes and Terraform.',
      ],
      why: [
        { title: 'Linux and networking first',
          body: 'Cloud is somebody else\'s computer on somebody else\'s network. Without these, the console is just buttons.' },
        { title: 'Two clouds, not one',
          body: 'AWS in depth and enough Azure to be portable. Employers rarely let you choose which one you get.' },
        { title: 'Containers properly',
          body: 'Docker, then Kubernetes — images, networking, storage and what actually happens when a pod will not start.' },
        { title: 'Infrastructure as code',
          body: 'Terraform from early on. Clicking through a console does not scale and cannot be reviewed.' },
        { title: 'Certification groundwork',
          body: 'The syllabus covers what AWS Solutions Architect Associate tests. The certificate is yours to sit; the knowledge is the point.' },
        { title: 'On-call reality',
          body: 'Monitoring, alerting, logs and incident basics — because being trusted with production is what the salary is for.' },
      ],
      roles: [
        { title: 'Cloud Engineer', salary: '₹5L – ₹14L',
          body: 'Builds and maintains cloud infrastructure — networking, compute, storage, access.',
          companies: ['Infosys', 'Capgemini', 'IBM'] },
        { title: 'DevOps Engineer', salary: '₹7L – ₹20L',
          body: 'Owns the path from commit to production: pipelines, environments, releases.',
          companies: ['Razorpay', 'Swiggy', 'Freshworks'] },
        { title: 'Site Reliability Engineer', salary: '₹9L – ₹24L',
          body: 'Keeps production up — monitoring, capacity, incidents and the automation that prevents repeats.',
          companies: ['Flipkart', 'PhonePe', 'Cred'] },
        { title: 'Platform Engineer', salary: '₹8L – ₹22L',
          body: 'Builds the internal tooling other engineers deploy on.',
          companies: ['Accenture', 'Deloitte', 'EY'] },
      ],
      syllabus: [
        { title: 'Linux, networking and scripting',
          body: 'The command line, permissions, processes, DNS, TCP/IP and enough Bash and Python to automate the boring parts.',
          topics: ['Linux', 'Bash', 'Networking', 'DNS', 'SSH', 'Python scripting'],
          exit: ['TCS', 'Infosys', 'Wipro'] },
        { title: 'AWS core services',
          body: 'Compute, storage, networking, identity and databases — built by hand first so the abstractions mean something.',
          topics: ['EC2', 'S3', 'VPC', 'IAM', 'RDS', 'CloudWatch'],
          exit: ['Capgemini', 'Accenture', 'IBM'] },
        { title: 'Containers and orchestration',
          body: 'Docker images and networking, then Kubernetes — deployments, services, config and debugging what will not start.',
          topics: ['Docker', 'Kubernetes', 'Helm', 'Ingress', 'Volumes', 'Debugging'],
          exit: ['Deloitte', 'EY', 'Freshworks'] },
        { title: 'IaC, CI/CD and capstone',
          body: 'Terraform, pipelines, monitoring and a capstone deploying a real application end to end.',
          topics: ['Terraform', 'CI/CD', 'GitHub Actions', 'Monitoring', 'Azure basics', 'Capstone'],
          exit: ['Razorpay', 'Swiggy', 'Flipkart'] },
      ],
      technologies: [
        'Linux', 'Bash', 'AWS', 'Azure', 'EC2', 'S3', 'VPC', 'IAM',
        'Docker', 'Kubernetes', 'Helm', 'Terraform', 'GitHub Actions', 'Jenkins',
        'Prometheus', 'Grafana', 'Git', 'Python',
      ],
      projects: [
        { title: 'Three-tier application on AWS',
          body: 'Networking, compute and a managed database, built by hand so you understand every piece before automating it.',
          tech: ['EC2', 'VPC', 'RDS'] },
        { title: 'Containerised deployment on Kubernetes',
          body: 'A multi-service application with health checks, config and rolling updates.',
          tech: ['Docker', 'Kubernetes', 'Helm'] },
        { title: 'Infrastructure as code',
          body: 'The same environment rebuilt entirely from Terraform, reviewable and reproducible.',
          tech: ['Terraform', 'Modules', 'State'] },
        { title: 'Pipeline and monitoring capstone',
          body: 'Commit to production automatically, with dashboards and alerts that catch a failure before a user does.',
          tech: ['CI/CD', 'Prometheus', 'Grafana'] },
      ],
      faq: [
        ['Do I need programming experience?',
         'Some scripting helps, and enough Bash and Python is taught in phase one. This is more about systems than software.'],
        ['Is the AWS certification included?',
         'The syllabus covers what Solutions Architect Associate tests, and mentors will prepare you for it. The exam fee is paid to AWS directly and is not part of the tuition.'],
      ],
    },
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

    detail: {
      headline: 'Defend real systems, and pay after you are placed.',
      intro:
        'Networking and Linux through offensive testing to security operations. Practical, ' +
        'hands-on and taught on systems you are authorised to attack — which is the only ' +
        'kind of practice worth having.',
      highlights: [
        'Pay a small registration fee and start learning.',
        'The rest of the tuition is due only after you are placed.',
        'Penetration testing, SOC operations and certification groundwork.',
      ],
      why: [
        { title: 'Fundamentals before tools',
          body: 'Networking, Linux and how systems actually talk. Running a scanner you do not understand is not security work.' },
        { title: 'Attack to understand defence',
          body: 'Offensive techniques in a lab you are authorised to break, because you cannot defend what you have never seen exploited.' },
        { title: 'SOC operations',
          body: 'Log analysis, SIEM, triage and incident response — the day-to-day of most security jobs, and the widest hiring door.' },
        { title: 'Legal and ethical grounding',
          body: 'Scope, authorisation and disclosure. Every technique here is illegal without written permission, and that is taught as seriously as the technique.' },
        { title: 'Certification groundwork',
          body: 'Aligned to what CEH and Security+ examine, so the certificate is a short step rather than a separate course.' },
        { title: 'Reporting that gets acted on',
          body: 'A finding nobody fixes is worthless. Writing findings a business will actually act on is part of the job.' },
      ],
      roles: [
        { title: 'SOC Analyst', salary: '₹4L – ₹10L',
          body: 'Monitors alerts, investigates incidents and escalates. The most common entry point into security.',
          companies: ['Infosys', 'Wipro', 'Capgemini', 'IBM'] },
        { title: 'Penetration Tester', salary: '₹6L – ₹16L',
          body: 'Tests applications and networks under contract, then writes findings the client can act on.',
          companies: ['Deloitte', 'EY', 'Accenture'] },
        { title: 'Security Engineer', salary: '₹8L – ₹20L',
          body: 'Builds and hardens defences — identity, cloud security posture, secure pipelines.',
          companies: ['Razorpay', 'PhonePe', 'Cred'] },
        { title: 'GRC / Security Analyst', salary: '₹5L – ₹13L',
          body: 'Audits, compliance and risk — where security meets policy and regulation.',
          companies: ['Deloitte', 'EY', 'IBM'] },
      ],
      syllabus: [
        { title: 'Networking, Linux and security basics',
          body: 'TCP/IP, DNS, HTTP, Linux administration and the CIA triad — the vocabulary and mechanics everything else assumes.',
          topics: ['TCP/IP', 'DNS', 'HTTP', 'Linux', 'Windows', 'Cryptography basics'],
          exit: ['TCS', 'Infosys', 'Wipro'] },
        { title: 'Offensive security',
          body: 'Reconnaissance, scanning, exploitation and web application attacks — in an authorised lab, with scope discipline throughout.',
          topics: ['Recon', 'Nmap', 'Burp Suite', 'OWASP Top 10', 'Metasploit', 'Privilege escalation'],
          exit: ['Capgemini', 'Accenture', 'IBM'] },
        { title: 'Defence and SOC operations',
          body: 'Logging, SIEM, detection rules, triage and incident response — plus hardening the things you learned to break.',
          topics: ['SIEM', 'Splunk', 'Log analysis', 'Detection', 'Incident response', 'Hardening'],
          exit: ['Deloitte', 'EY', 'Freshworks'] },
        { title: 'Cloud security, reporting and capstone',
          body: 'Securing cloud environments, identity and secrets, then a full engagement written up as a professional report.',
          topics: ['Cloud security', 'IAM', 'Secrets', 'Compliance', 'Reporting', 'Capstone'],
          exit: ['Razorpay', 'PhonePe', 'Cred'] },
      ],
      technologies: [
        'Linux', 'Windows', 'Nmap', 'Wireshark', 'Burp Suite', 'Metasploit',
        'OWASP', 'Splunk', 'SIEM', 'Kali', 'Python', 'Bash',
        'AWS security', 'IAM', 'Git',
      ],
      projects: [
        { title: 'Network assessment in the lab',
          body: 'Map, scan and assess an authorised lab network, then document what you found and why it matters.',
          tech: ['Nmap', 'Wireshark', 'Reporting'] },
        { title: 'Web application security test',
          body: 'Work the OWASP Top 10 against a deliberately vulnerable application and prove each finding.',
          tech: ['Burp Suite', 'OWASP', 'Python'] },
        { title: 'Detection and response exercise',
          body: 'Build detection rules in a SIEM, then triage a simulated incident end to end.',
          tech: ['SIEM', 'Splunk', 'Log analysis'] },
        { title: 'Full engagement capstone',
          body: 'A scoped assessment with a written report — findings, severity, evidence and remediation a business could act on.',
          tech: ['Methodology', 'Reporting', 'Remediation'] },
      ],
      faq: [
        ['Is any of this legal to practise?',
         'Only against systems you own or have written authorisation to test. All lab work is on environments provided for that purpose, and scope and authorisation are taught from the first week.'],
        ['Which certification does this prepare me for?',
         'The syllabus is aligned to CEH and CompTIA Security+. Exam fees are paid to those bodies directly and are not part of the tuition.'],
      ],
    },
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

    detail: {
      headline: 'Market with numbers behind it, and pay after you are placed.',
      intro:
        'Search, paid media, content and analytics, with AI tooling through the whole workflow. ' +
        'A route into tech companies that does not require writing code — but does require ' +
        'being able to prove what worked.',
      highlights: [
        'Pay a small registration fee and start learning.',
        'The rest of the tuition is due only after you are placed.',
        'No coding required — but real analytics throughout.',
      ],
      why: [
        { title: 'Measurement first',
          body: 'Anyone can run an ad. Being able to prove what it returned is what gets you hired and promoted.' },
        { title: 'Real ad spend',
          body: 'Live campaigns with a real budget, because managing spend is a different skill from reading about it.' },
        { title: 'AI in the workflow',
          body: 'Where AI genuinely speeds up research, drafting and reporting — and where it produces confident nonsense.' },
        { title: 'SEO that survives updates',
          body: 'Intent, structure and technical health rather than tricks that stop working at the next algorithm change.' },
        { title: 'Analytics you can defend',
          body: 'GA4, attribution and the honest limits of it. Knowing what your numbers cannot tell you is part of the job.' },
        { title: 'A portfolio, not a certificate',
          body: 'You finish with campaigns, dashboards and case studies you can show — which is what interviews ask for.' },
      ],
      roles: [
        { title: 'Digital Marketing Executive', salary: '₹3L – ₹7L',
          body: 'Runs day-to-day campaigns across search, social and email.',
          companies: ['Infosys', 'Swiggy', 'Razorpay'] },
        { title: 'Performance Marketing Analyst', salary: '₹5L – ₹12L',
          body: 'Owns paid spend and the reporting that justifies it.',
          companies: ['Flipkart', 'PhonePe', 'Cred'] },
        { title: 'SEO Specialist', salary: '₹4L – ₹10L',
          body: 'Organic growth — content strategy, technical health and search intent.',
          companies: ['Freshworks', 'Capgemini', 'Accenture'] },
        { title: 'Marketing Analyst', salary: '₹5L – ₹13L',
          body: 'Turns campaign and product data into decisions the business acts on.',
          companies: ['Deloitte', 'EY', 'IBM'] },
      ],
      syllabus: [
        { title: 'Foundations and content',
          body: 'How digital channels fit together, who you are talking to, and writing that has a job to do.',
          topics: ['Marketing funnel', 'Audience research', 'Content strategy', 'Copywriting', 'Brand basics', 'AI drafting'],
          exit: ['Infosys', 'Wipro', 'Capgemini'] },
        { title: 'SEO and organic growth',
          body: 'Keyword and intent research, on-page and technical SEO, and building authority that lasts.',
          topics: ['Keyword research', 'On-page SEO', 'Technical SEO', 'Link building', 'Search Console', 'Content ops'],
          exit: ['Accenture', 'Freshworks', 'IBM'] },
        { title: 'Paid media',
          body: 'Google and Meta ads with a real budget — structure, targeting, creative testing and cost control.',
          topics: ['Google Ads', 'Meta Ads', 'Campaign structure', 'A/B testing', 'Budgeting', 'Retargeting'],
          exit: ['Deloitte', 'EY', 'Razorpay'] },
        { title: 'Analytics, automation and capstone',
          body: 'GA4, attribution, dashboards and marketing automation, then a full campaign run and reported end to end.',
          topics: ['GA4', 'Attribution', 'Dashboards', 'Email automation', 'Reporting', 'Capstone'],
          exit: ['Swiggy', 'Flipkart', 'PhonePe'] },
      ],
      technologies: [
        'Google Ads', 'Meta Ads', 'GA4', 'Google Search Console', 'Google Tag Manager',
        'SEMrush', 'Ahrefs', 'Canva', 'Mailchimp', 'HubSpot', 'Looker Studio',
        'ChatGPT', 'Excel', 'WordPress',
      ],
      projects: [
        { title: 'SEO audit and content plan',
          body: 'A full audit of a real site with prioritised fixes and a content plan tied to search intent.',
          tech: ['Search Console', 'SEMrush', 'Content'] },
        { title: 'Paid campaign with real budget',
          body: 'Plan, launch and optimise a live campaign, then report honestly on what the spend returned.',
          tech: ['Google Ads', 'Meta Ads', 'A/B testing'] },
        { title: 'Analytics dashboard',
          body: 'A GA4 and Looker Studio dashboard a non-marketer could read and act on.',
          tech: ['GA4', 'Looker Studio', 'Tag Manager'] },
        { title: 'Full funnel capstone',
          body: 'One campaign from research through content, spend and automation to a results write-up.',
          tech: ['Strategy', 'Automation', 'Reporting'] },
      ],
      faq: [
        ['Do I need a marketing degree?',
         'No. Most of this is learned by doing, and the program starts from fundamentals.'],
        ['Will I have to write code?',
         'No. You will work with analytics tools and spreadsheets, and touch a little HTML for technical SEO — but no programming.'],
      ],
    },
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

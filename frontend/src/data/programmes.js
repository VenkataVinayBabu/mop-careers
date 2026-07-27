/*
 * ============================================================================
 *  PROGRAMME CATALOGUE — edit this file to change what the public site lists.
 * ============================================================================
 *  Adding a programme is one entry in this array; nothing else needs touching.
 *
 *  NOTE ON CONTENT: the Python topics come from the fixed day 1-11 syllabus.
 *  The Java and Gen AI topic lists were drafted as placeholders and have NOT
 *  been confirmed by MOP Careers — review and correct them before this goes
 *  in front of real visitors.
 *
 *  Durations are deliberately not shown on the public site.
 * ============================================================================
 */

export const PROGRAMMES = [
  {
    id: 'python-full-stack',
    name: 'Python Full Stack',
    tagline: 'Build complete web applications with Python, SQL, FastAPI and React.',
    accent: 'teal',
    // Confirmed: matches the seeded day 1-11 syllabus.
    confirmed: true,
    description:
      'Start from the fundamentals of Python and finish able to build and ship a full web application on your own. Covers the language, relational databases, API development and a modern React front end.',
    modules: [
      'Python fundamentals and OOP',
      'Databases and SQL with PostgreSQL',
      'FastAPI and REST API development',
      'React, hooks and Tailwind CSS',
      'Authentication and deployment',
      'Capstone project',
    ],
    forWhom: 'Freshers and career switchers with no prior programming experience.',
  },
  {
    id: 'java-full-stack',
    name: 'Java Full Stack',
    tagline: 'Enterprise-grade development with Java, Spring Boot and modern front end.',
    accent: 'orange',
    confirmed: false,
    description:
      'The enterprise track. Learn Java properly, then build production-style backend services with Spring Boot and pair them with a modern front end. Suited to the large services and product companies that hire on the Java stack.',
    modules: [
      'Core Java and OOP',
      'Collections, streams and exception handling',
      'Spring and Spring Boot',
      'REST APIs and JPA / Hibernate',
      'SQL and database design',
      'Front end integration and capstone project',
    ],
    forWhom: 'Freshers targeting enterprise and services-company roles.',
  },
  {
    id: 'gen-ai',
    name: 'Gen AI',
    tagline: 'Build real applications on top of large language models.',
    accent: 'navy',
    confirmed: false,
    description:
      'A practical track for building software with generative AI rather than just using it. Covers prompting, working with model APIs, retrieval over your own data, and putting an AI feature into a real application.',
    modules: [
      'Python essentials for AI work',
      'Working with LLM APIs',
      'Prompt design and evaluation',
      'Embeddings and retrieval (RAG)',
      'Building AI-powered features',
      'Capstone project',
    ],
    forWhom: 'Anyone who wants to build AI products, including non-CS graduates.',
  },
];

export const PROGRAMME_OPTIONS = [
  ...PROGRAMMES.map((p) => ({ value: p.name, label: p.name })),
  { value: 'Not sure yet', label: 'Not sure yet' },
];

const ACCENT = {
  teal: { bar: 'border-t-teal', chip: 'bg-teal-100 text-teal-700', dot: 'text-teal' },
  orange: { bar: 'border-t-orange', chip: 'bg-orange-100 text-orange-700', dot: 'text-orange' },
  navy: { bar: 'border-t-navy-400', chip: 'bg-navy-100 text-navy-600', dot: 'text-navy-400' },
};

export const accentClasses = (accent) => ACCENT[accent] || ACCENT.teal;

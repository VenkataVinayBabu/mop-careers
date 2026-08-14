import { PublicFloats, PublicFooter, PublicHeader, useHashScroll } from './PublicChrome';
import { useSite } from '../../data/siteSettings';

/*
 * The careers page, matching what MOP publishes at
 * mopcareers.in/careers.php — the same sections, benefits and openings.
 *
 * The content is hardcoded here rather than coming from a table, unlike the
 * rest of the marketing site. That is a deliberate first cut: openings change
 * a few times a year, not weekly, and a `job_openings` table plus its admin
 * screen is a bigger job than the page itself. When roles start changing often
 * enough that editing this file is a nuisance, that is the signal to lift
 * OPENINGS into Admin > Website the way programmes and mentors already are.
 *
 * Every figure below — salary bands, years of experience, the student count —
 * is MOP's own published copy, carried across as-is. None of it is verified.
 */

const BENEFITS = [
  {
    title: 'Impactful Work',
    body: "Every day, you'll be helping students transform their careers. Your work directly impacts thousands of lives.",
  },
  {
    title: 'Career Growth',
    body: "Grow your career with us. We invest in our team's professional development and advancement.",
  },
  {
    title: 'Great Team',
    body: 'Work with talented, passionate individuals who are committed to excellence and continuous learning.',
  },
  {
    title: 'Competitive Benefits',
    body: 'Competitive salary, health insurance, flexible work arrangements, and generous leave policies.',
  },
  {
    title: 'Modern Tech Stack',
    body: 'Work with latest technologies and tools. We believe in using the best tools for the job.',
  },
  {
    title: 'Work-Life Balance',
    body: 'We value work-life balance. Flexible hours, remote work options, and a supportive culture.',
  },
];

const OPENINGS = [
  {
    title: 'Senior Full Stack Developer',
    department: 'Engineering',
    location: 'Remote',
    body: "We're looking for an experienced full-stack developer to build and maintain our learning platform. You'll work on features used by 50,000+ students daily.",
    experience: '5-8 years',
    salary: '₹20-30 LPA',
    skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
  },
  {
    title: 'Placement Manager',
    department: 'Placement Team',
    location: 'Bangalore',
    body: 'Lead our placement efforts by building relationships with companies and ensuring our students land great jobs. A key role in our mission.',
    experience: '3-5 years in HR/Placement',
    salary: '₹12-18 LPA',
    skills: ['HR', 'Communication', 'Relationship Management'],
  },
  {
    title: 'Instructor - Web Development',
    department: 'Education',
    location: 'Hybrid',
    body: 'Teach our Full Stack and Web Development courses to passionate students. Create engaging content and mentor the next generation of developers.',
    experience: '3-7 years in web development',
    salary: '₹10-16 LPA',
    skills: ['React', 'Teaching', 'Mentoring'],
  },
  {
    title: 'Content Writer',
    department: 'Marketing',
    location: 'Remote',
    body: 'Create compelling content for our website, blogs, and marketing materials. Help us tell our story and reach more students.',
    experience: '2-4 years',
    salary: '₹8-12 LPA',
    skills: ['Writing', 'SEO', 'Content Strategy'],
  },
];

export default function Careers() {
  useHashScroll();
  const site = useSite();

  /* Applications go to whatever address is configured under Admin > Website,
     so changing where they land never needs a developer. The role is put in
     the subject line — an inbox of mails all titled "Application" is not much
     use to whoever sorts them. */
  const applyHref = (role) =>
    site.email
      ? `mailto:${site.email}?subject=${encodeURIComponent(`Application — ${role}`)}`
      : '/#enquire';

  return (
    <div className="bg-paper">
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="bg-navy-900 py-20 text-center sm:py-24">
          <div className="mx-auto max-w-[820px] px-6">
            <span className="inline-flex rounded-full bg-orange px-3 py-1 text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-white">
              Join Our Team
            </span>
            <h1 className="mt-5 text-3xl font-bold text-white sm:text-5xl">
              Careers at MOP Careers
            </h1>
            <p className="mx-auto mt-4 max-w-[620px] text-navy-200">
              Help us transform lives through education. Join a team of passionate professionals
              dedicated to changing the future of learning.
            </p>
            <a href="#openings" className="pbtn-primary mt-8 inline-flex">
              View Openings &rarr;
            </a>
          </div>
        </section>

        {/* Why join */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">
              Why Join MOP Careers?
            </h2>
            <p className="mt-3 text-center text-navy-400">
              Be part of a mission-driven organization transforming education
            </p>

            <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className="rounded-2xl border border-navy-100 bg-white p-6">
                  <h3 className="font-semibold text-navy">{b.title}</h3>
                  <p className="mt-2 text-[0.9rem] text-navy-400">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Openings — the anchor MOP's own link points at. */}
        <section id="openings" className="scroll-mt-24 bg-navy-50 py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">
              Open Positions
            </h2>
            <p className="mt-3 text-center text-navy-400">
              Check out the opportunities available to join our team
            </p>

            <div className="mt-11 grid gap-5">
              {OPENINGS.map((job) => (
                <div
                  key={job.title}
                  className="rounded-2xl border border-navy-100 bg-white p-6 sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-navy">{job.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-[0.75rem] font-semibold">
                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-ink">
                          {job.department}
                        </span>
                        <span className="rounded-full bg-navy-50 px-2.5 py-1 text-navy-500">
                          {job.location}
                        </span>
                      </div>
                    </div>
                    <a href={applyHref(job.title)} className="pbtn-navy pbtn-sm shrink-0">
                      Apply Now &rarr;
                    </a>
                  </div>

                  <p className="mt-4 text-[0.9rem] text-navy-400">{job.body}</p>

                  <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[0.85rem]">
                    <div className="flex gap-2">
                      <dt className="text-navy-400">Experience:</dt>
                      <dd className="font-medium text-navy">{job.experience}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-navy-400">Salary:</dt>
                      <dd className="font-medium text-navy">{job.salary}</dd>
                    </div>
                  </dl>

                  <ul className="mt-4 flex flex-wrap gap-2">
                    {job.skills.map((s) => (
                      <li
                        key={s}
                        className="rounded-md bg-navy-50 px-2.5 py-1 text-[0.75rem] font-medium text-navy-500"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-navy-500">
                Don&apos;t see a position that fits? Send us your resume and let&apos;s talk!
              </p>
              <a href={applyHref('Open application')} className="pbtn-outline mt-4 inline-flex">
                Send Your Resume &rarr;
              </a>
            </div>
          </div>
        </section>

        {/* Closing band */}
        <section className="bg-navy-900 py-16 text-center sm:py-20">
          <div className="mx-auto max-w-[720px] px-6">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to Make an Impact?
            </h2>
            <p className="mt-3 text-navy-200">
              Join us in transforming lives through education. Let&apos;s build the future together.
            </p>
            <a href={applyHref('Open application')} className="pbtn-primary mt-7 inline-flex">
              Send Your Resume &rarr;
            </a>
          </div>
        </section>
      </main>

      <PublicFooter />
      <PublicFloats />
    </div>
  );
}

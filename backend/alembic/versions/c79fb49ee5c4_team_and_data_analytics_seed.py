"""team and data analytics seed

Revision ID: c79fb49ee5c4
Revises: a79a85b6fc24
Create Date: 2026-08-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c79fb49ee5c4'
down_revision: Union[str, None] = 'a79a85b6fc24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Generated from the rows as they were reviewed locally rather than retyped —
# a hand-copied syllabus is how the deployed one ends up differing from the one
# somebody actually read.
BALARAMA = {'section': 'team',
 'name': 'Balarama Krishna Kaveti',
 'role': 'Co-developer — MOP Careers Platform',
 'tags': ['Ex-Virtusa', 'TCS'],
 'meta': '4.5+ Years · Java · Spring Boot · Microservices',
 'bio': 'Balarama Krishna Kaveti is a Full Stack Java Developer with around 4.5 years of '
        'experience building scalable and reliable web applications using Java, Spring Boot, '
        'and Microservices. He is currently working at TCS and previously worked at Virtusa. '
        'He has worked across the insurance and banking domains, contributing to enterprise '
        'applications and customer-facing solutions.\n'
        '\n'
        'He has designed and developed backend services and REST APIs for business-critical '
        'applications, implementing business logic, database integrations, authentication, and '
        'microservices communication. His experience includes Java, Spring Boot, Spring Data '
        'JPA, Spring Security, REST APIs, PostgreSQL, Kafka, Docker, Kubernetes, and CI/CD.\n'
        '\n'
        'His focus is on building practical, maintainable, and scalable software, with clean '
        'backend architecture and reliable APIs. He also has experience with frontend '
        'technologies such as React, enabling him to work across both backend and frontend '
        'layers and deliver complete end-to-end applications.',
 'photo_url': '/team/balarama.jpg',
 'published': True,
 'sort_order': 40}

DATA_ANALYTICS = {'slug': 'data-analytics-with-ai',
 'name': 'Data Analytics with AI',
 'category': 'ai',
 'badge': 'New',
 'duration': '4–6 months',
 'ctc_avg': '₹4–9 LPA avg',
 'ctc_high': '',
 'summary': 'Excel, SQL, Python, Power BI and Tableau with AI analytics — live and mentor-led, '
            'finishing with a capstone dashboard you can walk an interviewer through.',
 'for_whom': 'Beginners from any background — it starts at Excel and SQL basics.',
 'skills': ['Excel', 'SQL', 'Python', 'Power BI', 'Tableau'],
 'featured': False,
 'confirmed': True,
 'published': True,
 'detail': {'headline': "India's Best Pay After Placement Data Analytics Program",
            'intro': 'A 5-month live program combining Excel, SQL, Python, Power BI and '
                     "Tableau with AI analytics tools — India's first IBM-certified AI-powered "
                     'analytics bootcamp. Pay a small registration fee to start; the tuition '
                     'is charged only after you land a qualifying analytics role.',
            'highlights': ['Pay ₹24,999 to start — tuition only after you are placed.',
                           'Excel, SQL, Python, Power BI and Tableau, taught live.',
                           'IBM industry certification alongside the MOP Careers certificate.'],
            'why': [{'title': 'Excel & Advanced Analytics',
                     'body': 'Pivot tables, VLOOKUP, Power Query and business reporting.'},
                    {'title': 'SQL Analytics',
                     'body': 'Joins, window functions, aggregations and real-world datasets.'},
                    {'title': 'Python for Data Analysis',
                     'body': 'Pandas, NumPy, Matplotlib, Seaborn and statistical analysis.'},
                    {'title': 'Power BI & Tableau',
                     'body': 'Interactive dashboards, KPI reports and business intelligence.'},
                    {'title': 'AI-Powered Analytics',
                     'body': 'IBM-certified AI tools for analytics — predictive analytics for '
                             'analysts.'},
                    {'title': '1:1 Mentorship',
                     'body': 'Weekly sessions with senior data analysts from top firms.'}],
            'roles': [{'title': 'Data Analyst',
                       'salary': '₹4L – ₹9L',
                       'body': 'Transforms raw business data into actionable insights using '
                               'SQL, Python and BI tools.',
                       'companies': ['Infosys', 'TCS', 'Wipro', 'Cognizant', 'EY']},
                      {'title': 'Business Analyst',
                       'salary': '₹5L – ₹10L',
                       'body': 'Bridges data and business strategy — analysing processes and '
                               'presenting insights to stakeholders.',
                       'companies': ['Accenture', 'Deloitte', 'PwC', 'Capgemini', 'HCL']},
                      {'title': 'BI Analyst',
                       'salary': '₹4L – ₹8L',
                       'body': 'Builds and maintains BI dashboards and reports using Power BI '
                               'and Tableau.',
                       'companies': ['Flipkart', 'Amazon', 'Razorpay', 'PhonePe', 'Groww']},
                      {'title': 'Reporting Analyst',
                       'salary': '₹3.5L – ₹7L',
                       'body': 'Creates recurring reports, automates data pipelines and '
                               'maintains data accuracy.',
                       'companies': ['Bajaj', 'L&T', 'Samsung', 'DHL', 'Bosch']}],
            'syllabus': [{'title': 'Excel & SQL Analytics Foundations',
                          'body': 'Months 1–2. Excel fundamentals to advanced — pivot tables, '
                                  'VLOOKUP, Power Query and business dashboards. SQL from '
                                  'basics to advanced — joins, window functions and real-world '
                                  'analytics on large datasets.',
                          'topics': ['Excel',
                                     'Pivot Tables',
                                     'VLOOKUP',
                                     'Power Query',
                                     'SQL',
                                     'Joins',
                                     'Window Functions',
                                     'Aggregations'],
                          'exit': ['Infosys', 'TCS', 'Wipro', 'Cognizant', 'Capgemini']},
                         {'title': 'Python for Analytics & Data Visualisation',
                          'body': 'Months 3–4. Pandas, NumPy, Matplotlib and Seaborn for EDA, '
                                  'data cleaning and statistical analysis. Power BI and '
                                  'Tableau for interactive business intelligence dashboards '
                                  'and executive reporting.',
                          'topics': ['Python',
                                     'Pandas',
                                     'NumPy',
                                     'Matplotlib',
                                     'Seaborn',
                                     'EDA',
                                     'Statistics',
                                     'Power BI',
                                     'Tableau'],
                          'exit': ['Deloitte', 'EY', 'PwC', 'Accenture', 'HCL', 'Razorpay']},
                         {'title': 'AI-Powered Analytics & Career Prep',
                          'body': 'Month 5. IBM-certified AI tools — predictive analytics, ML '
                                  'for analysts and AI-driven reporting. Capstone analytics '
                                  'project, mock interviews, ATS resume and job referrals.',
                          'topics': ['AI Analytics',
                                     'Predictive Analytics',
                                     'ML for Analysts',
                                     'IBM Certification',
                                     'Capstone Project',
                                     'Mock Interviews',
                                     'ATS Resume'],
                          'exit': ['Flipkart', 'Amazon', 'PhonePe', 'Groww', 'L&T', 'EY']}],
            'technologies': ['Excel',
                             'SQL',
                             'Python',
                             'Pandas',
                             'NumPy',
                             'Matplotlib',
                             'Power BI',
                             'Tableau',
                             'Jupyter',
                             'Git',
                             'IBM AI Tools',
                             'Seaborn'],
            'projects': [{'title': 'Retail Sales Analysis',
                          'body': 'Analyse sales trends, customer segments and product '
                                  'performance using Excel, SQL and Python.',
                          'tech': ['Excel + SQL',
                                   'Python Pandas',
                                   'EDA & Insights',
                                   'Business Report']},
                         {'title': 'Power BI Business Dashboard',
                          'body': 'Interactive executive dashboard with KPIs, drill-throughs '
                                  'and data storytelling.',
                          'tech': ['Power BI',
                                   'DAX Formulas',
                                   'Interactive Visuals',
                                   'KPI Reporting']},
                         {'title': 'Healthcare Data Analysis',
                          'body': 'Clean, analyse and visualise a healthcare dataset with a '
                                  'Tableau dashboard.',
                          'tech': ['SQL Analytics',
                                   'Python Pandas',
                                   'Tableau Dashboard',
                                   'Insights Report']},
                         {'title': 'AI Analytics Capstone',
                          'body': 'SQL, Python, Power BI and IBM AI tools — predictive '
                                  'analytics and business recommendations.',
                          'tech': ['SQL + Python',
                                   'Power BI',
                                   'IBM AI Tools',
                                   'Predictive Analytics']}],
            'faq': [['Is placement guaranteed?',
                     'We provide 6 months of dedicated placement assistance. Our learners have '
                     'achieved an 87% placement success rate.'],
                    ['Do I need prior experience?',
                     'No. It starts from Excel and SQL basics — designed for complete '
                     'beginners from any background.'],
                    ['What is Pay After Placement?',
                     'You pay ₹24,999 to start. The ₹50,000 + GST tuition fee is charged only '
                     'after you are placed at your agreed CTC.'],
                    ['How long does the program take?',
                     '4–6 months with 100% live online classes. All classes are recorded for '
                     'revision.'],
                    ['What certifications will I receive?',
                     "MOP Careers Certificate plus IBM Industry Certification — India's first "
                     'IBM-certified AI analytics bootcamp.'],
                    ['What roles can I target?',
                     'Data Analyst, Business Analyst, BI Analyst or Reporting Analyst at '
                     'Infosys, TCS, EY, Deloitte, Flipkart and more.']],
            'fees': {'registration': '₹24,999',
                     'registrationWas': '₹60,000',
                     'registrationNote': 'Inclusive of taxes · pay to start',
                     'tuition': '₹50,000 + GST',
                     'tuitionWas': '₹90,000',
                     'tuitionNote': 'Pay after you get a job',
                     'emi': ''}},
 'total_days': 45,
 'curriculum': [],
 'sort_order': 90}


def upgrade() -> None:
    """Three pieces of content that exist only as database rows.

    Pushing code alone would ship the photos and leave production showing eight
    programmes and a team of one, so they are seeded here the same way the two
    leaders and the four job openings were. All three stay editable at
    Admin > Website afterwards; this only decides what they start as.
    """
    leaders = sa.table(
        'leaders',
        sa.column('section', sa.String), sa.column('name', sa.String),
        sa.column('role', sa.String), sa.column('tags', sa.JSON),
        sa.column('meta', sa.String), sa.column('bio', sa.Text),
        sa.column('photo_url', sa.String), sa.column('published', sa.Boolean),
        sa.column('sort_order', sa.Integer),
    )

    # The developer titles were reworded after that row was first seeded, so
    # this corrects the existing one rather than inserting a second.
    op.execute(
        sa.text("UPDATE leaders SET role = :role, photo_url = :photo WHERE name = :name")
        .bindparams(
            role='Developer \u2014 MOP Careers Platform',
            photo='/team/vinay.jpg',
            name='Venkata Vinay Babu Kuppala',
        )
    )
    op.bulk_insert(leaders, [BALARAMA])

    programs = sa.table(
        'programs',
        sa.column('slug', sa.String), sa.column('name', sa.String),
        sa.column('category', sa.String), sa.column('badge', sa.String),
        sa.column('duration', sa.String), sa.column('ctc_avg', sa.String),
        sa.column('ctc_high', sa.String), sa.column('summary', sa.Text),
        sa.column('for_whom', sa.Text), sa.column('skills', sa.JSON),
        sa.column('featured', sa.Boolean), sa.column('confirmed', sa.Boolean),
        sa.column('published', sa.Boolean), sa.column('detail', sa.JSON),
        sa.column('total_days', sa.Integer), sa.column('curriculum', sa.JSON),
        sa.column('sort_order', sa.Integer),
    )
    op.bulk_insert(programs, [DATA_ANALYTICS])


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM leaders WHERE name = :name")
        .bindparams(name='Balarama Krishna Kaveti')
    )
    op.execute(
        sa.text("DELETE FROM programs WHERE slug = :slug")
        .bindparams(slug='data-analytics-with-ai')
    )

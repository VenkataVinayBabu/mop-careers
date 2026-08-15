/*
 * The three legal pages, exactly as MOP publishes them on mopcareers.in.
 *
 * Held as structured data rather than JSX so all three render through one
 * component and cannot drift apart in styling, and so replacing a clause is an
 * edit to a string rather than to markup.
 *
 * Deliberately NOT editable from the admin area. Legal copy is structured —
 * numbered clauses, definition rows, nested lists — and a plain textarea would
 * flatten it; it also changes rarely, and when it does, the wording has usually
 * been through someone who cares about the exact words. A developer paste is
 * the right amount of friction. If that ever stops being true, this file is the
 * shape a `legal_documents` table would take.
 *
 * A block is one of:
 *   "some text"                  a paragraph
 *   { sub, p }                   a sub-heading with its paragraph
 *   { list: [...] }              bullets
 *   { defs: [[label, value]] }   label/value rows, e.g. company details
 */

const COMPANY_DETAILS = [
  ['Company Name', 'MOP CAREERS SOFTWARE SERVICES PVT LTD'],
  ['Registered Office', 'Ground Floor, No. 10, 14th Main, 5th Sector, HSR Layout, Bangalore South, Bangalore, Karnataka, India – 560102'],
  ['Legal & Privacy', 'legal@mopcareers.in'],
  ['General Contact', 'contacts@mopcareers.in'],
];

export const LEGAL_DOCS = {
  'privacy-policy': {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    intro:
      'Your privacy is important to us. Learn how MOP Careers collects, uses, and protects your personal information.',
    lastUpdated: '28 July 2026',
    company: 'MOP CAREERS SOFTWARE SERVICES PVT LTD',
    contactPerson: 'Anil Kumar',
    preamble:
      'MOP CAREERS SOFTWARE SERVICES PVT LTD ("MOP Careers", "Company", "we", "us", or "our") respects your privacy and is committed to protecting the personal information you provide to us. This Privacy Policy explains how we collect, use, disclose, store, and protect your personal information when you visit our website, register for our programs, contact us, use our services, or otherwise interact with MOP Careers.',
    sections: [
      {
        heading: 'Company Details',
        blocks: [{
          defs: [
            ['Company Name', 'MOP CAREERS SOFTWARE SERVICES PVT LTD'],
            ['Registered Office', 'Ground Floor, No. 10, 14th Main, 5th Sector, HSR Layout, Bangalore South, Bangalore, Karnataka, India – 560102'],
            ['Contact Person', 'Anil Kumar'],
            ['Legal & Privacy', 'legal@mopcareers.in'],
            ['General Contact', 'contacts@mopcareers.in'],
          ],
        }],
      },
      {
        heading: 'Information We Collect',
        blocks: [
          'Depending on how you interact with MOP Careers, we may collect the following categories of information:',
          {
            sub: 'Personal Information',
            p: 'Full name · Email address · Mobile/telephone number · Residential or correspondence address · Date of birth or age · Educational qualifications · College/university details · Graduation year · Work experience · Skills and technical background · Resume/CV and professional information · Career preferences and job interests · Information submitted through applications, forms, or enquiries.',
          },
          {
            sub: 'Program & Payment Information',
            p: 'When you enroll in a MOP Careers program or make a payment, we may collect information necessary to process and administer your enrollment and payments. Payment information may be processed through authorized third-party payment service providers. We do not intend to store complete card, banking, or other sensitive payment credentials on our own systems unless required and permitted by applicable law.',
          },
          {
            sub: 'Communication Information',
            p: 'We may collect information you provide when you contact our support team, request a callback, book a counseling session, communicate with mentors or career advisors, submit feedback, participate in surveys, or communicate with us through email, telephone, WhatsApp, social media, or other channels.',
          },
          {
            sub: 'Technical Information',
            p: 'When you access our website or digital services, certain technical information may be collected automatically, including IP address, browser type, device information, operating system, website pages visited, date and time of access, referring website, and general usage and interaction information. We may use cookies and similar technologies to improve website functionality, security, analytics, and user experience.',
          },
        ],
      },
      {
        heading: 'How We Collect Information',
        blocks: [
          'We may collect information directly from you when you submit a form or application, register for a course or program, contact us, request career guidance, participate in assessments, mock interviews, or projects, submit a resume, communicate with our team, or automatically through website technologies such as cookies. We may also collect information from service providers or business partners where legally permitted.',
        ],
      },
      {
        heading: 'How We Use Your Information',
        blocks: [
          'We may use personal information for legitimate business and service-related purposes, including:',
          { sub: 'Providing Our Services', p: 'Process program registrations, provide access to courses, deliver live classes and mentoring, facilitate assessments and projects, provide mock interviews, and support placement assistance.' },
          { sub: 'Communication', p: 'Respond to enquiries, confirm registrations, provide program updates, schedule counseling or mentoring sessions, and provide placement-related communication.' },
          { sub: 'Improving Our Services', p: 'Analyze usage and feedback to improve programs, website performance, and learner experience.' },
          { sub: 'Security and Fraud Prevention', p: 'Protect our website and systems, prevent unauthorized access, detect fraud or misuse, and investigate security incidents.' },
          { sub: 'Legal and Regulatory Compliance', p: 'Comply with applicable laws, respond to lawful requests, maintain business records, and protect the rights and interests of MOP Careers and our users.' },
        ],
      },
      {
        heading: 'Placement and Recruitment Services',
        blocks: [
          'If you participate in our placement assistance services, you understand that certain professional information may need to be shared with potential employers, recruiters, or recruitment partners for legitimate employment-related purposes. This information may include your name, contact details, resume, educational qualifications, skills, work experience, assessment results, interview-related information, and relevant professional profile information. We aim to share only information reasonably necessary for the relevant recruitment or placement activity.',
        ],
      },
      {
        heading: 'Marketing Communications',
        blocks: [
          'With your consent where required by applicable law, we may contact you regarding courses, programs, career opportunities, events, webinars, workshops, offers, promotions, and other MOP Careers services. You may request to stop receiving promotional communications by contacting us or using an available unsubscribe mechanism. Please note that you may continue to receive essential service-related communications even after opting out.',
        ],
      },
      {
        heading: 'Cookies and Similar Technologies',
        blocks: [
          'Our website may use cookies and similar technologies to remember user preferences, improve website performance, understand website traffic, improve user experience, support security, and measure marketing effectiveness. You may be able to control or disable cookies through your browser settings. Disabling certain cookies may affect website functionality.',
        ],
      },
      {
        heading: 'Sharing of Personal Information',
        blocks: [
          'We do not sell your personal information as a standalone product. We may share information where reasonably necessary with authorized employees and representatives, mentors and trainers, placement and recruitment partners, potential employers, technology and hosting service providers, payment processors, communication and customer-support providers, analytics and marketing service providers, professional advisors, and government authorities or law-enforcement agencies where legally required.',
        ],
      },
      {
        heading: 'Third-Party Services and Links',
        blocks: [
          'Our website or services may contain links to third-party websites, platforms, applications, payment gateways, recruitment portals, or social media services. MOP Careers is not responsible for the privacy practices, content, or security of third-party websites or services. We encourage you to review the privacy policies of third parties before providing them with personal information.',
        ],
      },
      {
        heading: 'Data Security',
        blocks: [
          'We take reasonable technical, administrative, and organizational measures to protect personal information against unauthorized access, misuse, alteration, disclosure, loss, or destruction. However, no internet transmission or electronic storage system can be guaranteed to be completely secure. Accordingly, while we take reasonable precautions, we cannot guarantee absolute security of information transmitted to or stored by us.',
        ],
      },
      {
        heading: 'Data Retention',
        blocks: [
          'We retain personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including providing our services, maintaining learner and business records, supporting placement activities, meeting contractual obligations, resolving disputes, and complying with legal and regulatory requirements. When information is no longer required, we may securely delete, anonymize, or otherwise dispose of it, subject to applicable legal requirements.',
        ],
      },
      {
        heading: 'Your Privacy Rights',
        blocks: [
          'Subject to applicable law, you may have rights relating to your personal information, including the ability to:',
          {
            list: [
              'Request information about personal data we process about you',
              'Request correction of inaccurate or incomplete information',
              'Request deletion where legally permitted',
              'Withdraw consent where processing is based on consent',
              'Opt out of promotional communications',
            ],
          },
        ],
      },
      {
        heading: "Children's Privacy",
        blocks: [
          'Our services are primarily intended for individuals who meet the applicable eligibility requirements for our programs. We do not knowingly collect personal information from children where such collection is prohibited by applicable law. If you believe that a child has provided personal information to us in circumstances where it should not have been collected, please contact us so that we can review and take appropriate action.',
        ],
      },
      {
        heading: 'International Data Transfers',
        blocks: [
          'Some of our technology or service providers may process information using infrastructure located outside India. Where personal information is transferred or processed across jurisdictions, we will take reasonable steps to ensure that such processing is carried out in accordance with applicable privacy and data protection requirements.',
        ],
      },
      {
        heading: 'Changes to This Privacy Policy',
        blocks: [
          'We may update this Privacy Policy from time to time to reflect changes in our services, technology, business practices, or applicable laws. When we make changes, we may update the "Last Updated" date at the top of this Privacy Policy. We encourage you to review this page periodically.',
        ],
      },
      {
        heading: 'Consent',
        blocks: [
          'By using the MOP Careers website or submitting your personal information to us, you acknowledge that you have read this Privacy Policy. Where consent is required under applicable law, we will seek appropriate consent before processing your personal information for the relevant purpose.',
        ],
      },
      {
        heading: 'Grievance and Privacy Contact',
        blocks: [{
          defs: [
            ['Contact Person', 'Anil Kumar'],
            ['Company', 'MOP CAREERS SOFTWARE SERVICES PVT LTD'],
            ['Registered Office', 'Ground Floor, No. 10, 14th Main, 5th Sector, HSR Layout, Bangalore South, Bangalore, Karnataka, India – 560102'],
            ['Legal & Privacy', 'legal@mopcareers.in'],
            ['General Contact', 'contacts@mopcareers.in'],
          ],
        }],
      },
    ],
  },

  'terms-of-service': {
    eyebrow: 'Legal',
    title: 'Terms & Conditions',
    intro:
      'Please read these terms carefully before using our platform or enrolling in any MOP Careers program.',
    lastUpdated: 'July 28, 2026',
    company: 'MOP CAREERS SOFTWARE SERVICES PVT LTD',
    sections: [
      {
        heading: 'Acceptance of Terms',
        blocks: [
          'By accessing and using the MOP Careers website, services, or enrolling in any MOP Careers program, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services. These terms apply to all visitors, learners, and registered users.',
        ],
      },
      {
        heading: 'Company Details',
        blocks: [{
          defs: [
            ['Company Name', 'MOP CAREERS SOFTWARE SERVICES PVT LTD'],
            ['Registered Office', 'Ground Floor, No. 10, 14th Main, 5th Sector, HSR Layout, Bangalore South, Bangalore, Karnataka, India – 560102'],
            ['Legal & Policy Enquiries', 'legal@mopcareers.in'],
            ['General Contact', 'contacts@mopcareers.in'],
          ],
        }],
      },
      {
        heading: 'User Eligibility',
        blocks: [
          'You must meet the applicable eligibility requirements for the program you wish to enroll in, as communicated at the time of enrollment. By enrolling, you represent and warrant that you meet these eligibility requirements. Our services are not intended for individuals who do not meet the stated eligibility criteria.',
        ],
      },
      {
        heading: 'Enrollment and Program Access',
        blocks: [
          'Upon enrollment and confirmation of applicable payment or registration, you are granted a limited, non-exclusive, non-transferable license to access and use the course materials for your personal learning purposes only. You may not:',
          {
            list: [
              'Share login credentials or program access with others',
              'Download, record, or distribute course materials without prior written permission',
              'Reproduce or use course content for commercial purposes',
              'Use the platform or course materials in a manner that violates applicable laws',
            ],
          },
        ],
      },
      {
        heading: 'Pay After Placement (PAP) Programs',
        blocks: [
          'MOP Careers offers selected Pay After Placement (PAP) programs under separate program-specific agreements. Enrollment in a PAP program is subject to the applicable PAP Agreement/Terms communicated at the time of enrollment. Key points:',
          {
            list: [
              'PAP programs require payment of a registration or enrollment fee upfront. The remaining program fee is payable subject to the placement conditions in the applicable PAP agreement.',
              'Placement assistance is provided subject to the learner meeting applicable program requirements, attendance, evaluation, and placement readiness conditions.',
              'MOP Careers does not guarantee specific employment or a specific salary, CTC, or job offer. Actual placement outcomes depend on learner performance, market conditions, employer requirements, and other factors.',
              'Where there is a conflict between these general Terms and a specific written PAP agreement, the PAP agreement will govern to the extent permitted by law.',
            ],
          },
        ],
      },
      {
        heading: 'Intellectual Property Rights',
        blocks: [
          'All course materials, including videos, lectures, live class recordings, assignments, projects, curricula, resources, branding, and platform content, are owned by MOP Careers or licensed to MOP Careers. You may not copy, reproduce, distribute, transmit, sell, publicly display, or create derivative works from the course content without our prior written permission. Unauthorized use of course content may result in termination of access and may give rise to legal liability.',
        ],
      },
      {
        heading: 'Payment Terms',
        blocks: [
          'Payment for programs must be made through authorized payment gateways and methods communicated at the time of enrollment. All transactions are subject to verification. We reserve the right to cancel any transaction if fraudulent activity or unauthorized access is detected. Applicable taxes will be charged as required by law. Refunds are subject to our Refund and Course Rescheduling Policy.',
        ],
      },
      {
        heading: 'Placement Assistance',
        blocks: [
          "MOP Careers will provide placement assistance to eligible learners who have met the applicable program completion, attendance, evaluation, and placement readiness requirements. Placement assistance may include resume support, mock interviews, job referrals, and connections to hiring partners. Placement assistance does not guarantee employment, a specific job offer, a minimum CTC, or a specific employer. Actual placement outcomes depend on the learner's performance, skills, interview results, market conditions, and employer decisions.",
        ],
      },
      {
        heading: 'Learner Responsibilities and Code of Conduct',
        blocks: [
          'As a learner, you agree to:',
          {
            list: [
              'Attend classes, complete assignments, and participate actively in the program',
              'Maintain respectful behavior in all interactions with mentors, staff, and other learners',
              'Not engage in harassment, bullying, discrimination, or disruptive behavior',
              'Follow all platform rules, program guidelines, and applicable assessment requirements',
              'Not attempt to hack, disrupt, or misuse the platform or its systems',
              'Provide accurate and truthful information during enrollment, assessments, and placement activities',
            ],
          },
        ],
      },
      {
        heading: 'Limitation of Liability',
        blocks: [
          'To the extent permitted by applicable law, MOP Careers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our platform, courses, or services. Our total liability in connection with any claim arising from these Terms or your use of our services shall not exceed the amount you paid for the relevant program in the twelve (12) months preceding the claim.',
        ],
      },
      {
        heading: 'Disclaimer of Warranties',
        blocks: [
          'Our programs and services are provided in good faith. While we strive to provide accurate, current, and high-quality content and services, MOP Careers does not provide warranties of any kind, express or implied, regarding specific learning outcomes, employment, CTC levels, or career results beyond what is expressly stated in the applicable program agreement. Technology, industry standards, and hiring markets change, and program content may be updated accordingly.',
        ],
      },
      {
        heading: 'Suspension and Termination',
        blocks: [
          'MOP Careers reserves the right to suspend or terminate your program access if you violate these Terms, engage in prohibited conduct, fail to meet program requirements, or engage in fraudulent or unlawful activity. In case of termination, applicable refund terms will apply in accordance with the Refund and Course Rescheduling Policy. Suspension or termination does not automatically discharge payment obligations that have already arisen under an applicable PAP agreement.',
        ],
      },
      {
        heading: 'Privacy',
        blocks: [
          "Your use of MOP Careers' services is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using our services, you acknowledge and agree to the collection and use of your information as described in the Privacy Policy.",
        ],
      },
      {
        heading: 'Third-Party Services and Links',
        blocks: [
          'Our website and services may contain links to or integrations with third-party websites, payment gateways, recruitment portals, or social media platforms. MOP Careers is not responsible for the content, accuracy, privacy practices, or security of these third-party services. Access to third-party services is at your own risk, and we encourage you to review their applicable terms and privacy policies.',
        ],
      },
      {
        heading: 'Modification of Terms',
        blocks: [
          'MOP Careers reserves the right to modify these Terms at any time to reflect changes in our services, programs, business practices, or applicable legal requirements. Updated Terms will be published on the MOP Careers website. Your continued use of our services after the publication of updated Terms constitutes your acceptance of the modified Terms. We recommend reviewing these Terms periodically.',
        ],
      },
      {
        heading: 'Governing Law and Jurisdiction',
        blocks: [
          'These Terms and Conditions are governed by and construed in accordance with the laws of India. Any disputes arising from or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Bangalore, Karnataka, India, unless otherwise required by applicable law.',
        ],
      },
      {
        heading: 'Contact Information',
        blocks: [{
          defs: [
            ['Company', 'MOP CAREERS SOFTWARE SERVICES PVT LTD'],
            ['Registered Office', 'Ground Floor, No. 10, 14th Main, 5th Sector, HSR Layout, Bangalore South, Bangalore, Karnataka, India – 560102'],
            ['Legal & Policy Enquiries', 'legal@mopcareers.in'],
            ['General Contact', 'contacts@mopcareers.in'],
          ],
        }],
      },
    ],
    footnote:
      'By enrolling in any MOP Careers program, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions, the Privacy Policy, the Refund and Course Rescheduling Policy, and any applicable PAP Agreement.',
  },

  'refund-policy': {
    eyebrow: 'Legal',
    title: 'Refund and Course Rescheduling Policy',
    intro:
      'Transparent and fair refund terms for all our learners enrolled in MOP Careers programs.',
    lastUpdated: 'July 28, 2026',
    company: 'MOP CAREERS SOFTWARE SERVICES PVT LTD',
    preamble:
      'Thank you for choosing MOP Careers for your learning and career journey. We are committed to providing a valuable and rewarding learning experience. Please carefully review this Refund and Course Rescheduling Policy before enrolling in any MOP Careers program. By enrolling, you acknowledge that you have read, understood, and agreed to this policy along with our Privacy Policy, Terms of Use, and applicable PAP Terms.',
    callouts: [
      { value: '7-Day Refund Window', label: 'For online instructor-led programs' },
      { value: '1 Batch Deferral', label: 'Transfer to next available cohort' },
      { value: '30 Days Processing', label: 'After review and approval' },
    ],
    sections: [
      {
        heading: 'Online Instructor-Led Programs',
        blocks: [
          'To qualify for a refund, all of the following conditions must be satisfied:',
          {
            list: [
              'The refund request must be submitted within 7 days from the date of course purchase/enrollment.',
              'You must have accessed less than 30% of the applicable e-learning/course content.',
              'You must have attended no more than one (1) live online class session.',
              'You must not have requested or received any exam voucher, certification voucher, kit, or other non-refundable program benefit.',
              'You must not have substantially used or consumed any paid program services that are identified as non-refundable.',
            ],
          },
          'If any of the above conditions are not met, the refund request may be rejected.',
        ],
      },
      {
        heading: 'Industry Certification / Joint Certification Programs',
        blocks: [
          'Programs that include certification from an external institute, university, company, or industry certification partner may be non-refundable, subject to the specific terms communicated at the time of enrollment. Where an exception is expressly permitted, the following conditions may apply:',
          {
            list: [
              'The refund request must be submitted within 7 days from the date of enrollment.',
              'The learner must have attended no more than one (1) live online class session.',
              'The learner must not have downloaded or substantially accessed restricted course materials.',
              'The learner must not have requested or received any exam voucher, certification voucher, kit, or similar benefit.',
              'Any external certification, registration, examination, or administrative charges already incurred may be non-refundable.',
            ],
          },
        ],
      },
      {
        heading: 'Self-Paced / Self-Learning Programs',
        blocks: [
          'For self-paced programs, a refund may be considered only where all of the following conditions are met:',
          {
            list: [
              'The refund request must be submitted within 7 days from the date of purchase.',
              'The learner must have consumed less than 25% of the video-learning content.',
              'The learner must not have requested or received any exam or certification voucher.',
              'The learner must not have substantially used any paid service or benefit identified as non-refundable.',
            ],
          },
          'Any refund request that does not satisfy all applicable conditions may not be accepted.',
        ],
      },
      {
        heading: 'Pay After Placement (PAP) Programs',
        blocks: [
          'MOP Careers offers selected Pay After Placement (PAP) programs under separate program-specific terms and conditions. The PAP model may have different enrollment, payment, placement, eligibility, and fee obligations from standard course purchases. Accordingly:',
          {
            list: [
              'PAP candidates must review and accept the PAP Agreement/Terms and Conditions applicable to their selected program.',
              'Refund, cancellation, placement, and payment obligations for PAP programs will be governed by the applicable PAP agreement.',
              'Any registration, administrative, assessment, certification, or third-party charges specifically identified as non-refundable will not be refundable, subject to applicable law.',
              "A candidate's withdrawal from training does not automatically cancel obligations that may have already arisen under the applicable PAP agreement.",
              'Where there is a conflict between this general Refund Policy and a specific written PAP agreement, the applicable PAP agreement will govern to the extent permitted by law.',
            ],
          },
        ],
      },
      {
        heading: 'Course Rescheduling / Batch Deferral Policy',
        blocks: [
          'If a learner wishes to defer, reschedule, or restart their course in a different batch, the learner must submit a request to MOP Careers through the official support/contact channel.',
          {
            sub: 'Batch Deferral Conditions',
            p: '',
          },
          {
            list: [
              'A learner may request one (1) batch deferral, subject to availability.',
              'The learner may request transfer to an available cohort scheduled within the next 3 months from the original batch start date.',
              'Batch deferral requests must be made before the learner has completed more than 20% of the applicable program, unless MOP Careers approves an exception.',
              'Rescheduling is subject to the availability of suitable batches, mentors, course schedules, and program capacity.',
              'Deferral does not automatically entitle the learner to a refund. Any additional charges will be communicated before the rescheduled batch is confirmed.',
            ],
          },
        ],
      },
      {
        heading: 'Important Terms Applicable to All Programs',
        blocks: [
          { sub: 'Refund Requests', p: 'Refund requests that do not satisfy the applicable eligibility conditions described in this policy will generally not be accepted.' },
          { sub: 'Refund Processing', p: 'Approved refunds will ordinarily be processed within 30 days after review and approval. The actual time taken may depend on the payment gateway, bank, or card issuer.' },
          { sub: 'Payment Gateway / Transaction Charges', p: 'Where applicable, payment gateway, transaction, certification, registration, administrative, or third-party charges that have already been incurred may be deducted from the refundable amount.' },
          { sub: 'Loans / Financing', p: 'If a learner has obtained financing or a loan to pay for a program, the learner may be responsible for applicable lender, cancellation, or processing charges that cannot be reversed by MOP Careers.' },
        ],
      },
      {
        heading: 'Course Changes, Postponement, or Cancellation by MOP Careers',
        blocks: [
          'MOP Careers reserves the right to reschedule, postpone, modify, or cancel a class, session, event, or program where reasonably necessary, including due to instructor unavailability, technical issues, operational requirements, insufficient enrollment, government restrictions, natural disasters, public health emergencies, internet or infrastructure disruptions, or other force majeure circumstances beyond the reasonable control of MOP Careers.',
          'Where reasonably possible, MOP Careers may provide an alternative batch, session, schedule, mentor, or delivery arrangement.',
        ],
      },
      {
        heading: 'How to Request a Refund',
        blocks: [
          'To request a refund, contact MOP Careers using the official contact details below. The request should include:',
          {
            list: [
              'Full name',
              'Registered email address and mobile number',
              'Program/course name and enrollment or transaction details',
              'Date of enrollment/purchase',
              'Reason for the refund request and any relevant supporting information',
            ],
          },
          { defs: [['Email', 'legal@mopcareers.in'], ['General Support', 'contacts@mopcareers.in']] },
        ],
      },
      {
        heading: 'How to Request Course Rescheduling',
        blocks: [
          'For batch deferral or rescheduling, contact MOP Careers as early as possible. The request should include:',
          {
            list: [
              'Full name and registered contact details',
              'Current program/batch',
              'Preferred new batch, if known',
              'Reason for requesting rescheduling',
            ],
          },
          'Approval is subject to the eligibility requirements and availability of an appropriate batch.',
        ],
      },
      {
        heading: 'Contact Us',
        blocks: [{
          defs: [
            ['Company', 'MOP CAREERS SOFTWARE SERVICES PVT LTD'],
            ['Registered Office', 'Ground Floor, No. 10, 14th Main, 5th Sector, HSR Layout, Bangalore South, Bangalore, Karnataka, India – 560102'],
            ['Legal & Policy Enquiries', 'legal@mopcareers.in'],
            ['General Support', 'contacts@mopcareers.in'],
          ],
        }],
      },
      {
        heading: 'Policy Updates',
        blocks: [
          'MOP Careers may update this Refund and Course Rescheduling Policy from time to time to reflect changes in our programs, business practices, or applicable legal requirements. The latest version will be published on the MOP Careers website with the applicable "Last Updated" date. This policy applies to enrollments made on or after the effective date stated above, unless otherwise specified in the applicable course, enrollment, or PAP agreement.',
        ],
      },
    ],
  },
};

export { COMPANY_DETAILS };

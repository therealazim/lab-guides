import LegalLayout, { type LegalSection } from '../components/LegalLayout'

const SECTIONS: LegalSection[] = [
  {
    title: 'Acceptance of these terms',
    paragraphs: [
      'These Terms of Use ("Terms") govern your access to and use of the LUPIC Laboratory Training Platform ("the Platform"), operated as part of the LUPIC project at Korea University in cooperation with the Karakalpakstan Medical Institute (KMI).',
      'By accessing or using the Platform, you agree to these Terms. If you do not agree, please do not use the Platform.',
    ],
  },
  {
    title: 'Educational purpose',
    paragraphs: [
      'The Platform provides equipment guides, standard operating procedures, training materials, and related information for educational and reference purposes. Content is intended to support laboratory training and knowledge sharing; it is not a substitute for formal instruction, institutional policy, or the manufacturer\u2019s documentation.',
    ],
  },
  {
    title: 'Laboratory safety and professional judgement',
    paragraphs: [
      'Laboratory work can involve hazardous equipment, chemicals, and biological materials. You are responsible for following your institution\u2019s safety rules, obtaining required training and supervision, and using equipment according to its official operating manual.',
      'Never rely solely on the Platform when operating equipment. If platform content conflicts with the manufacturer\u2019s manual, your laboratory\u2019s procedures, or instructions from qualified staff, those official sources take precedence.',
    ],
  },
  {
    title: 'Intellectual property',
    paragraphs: [
      'The Platform\u2019s layout, interface, and original text are provided for educational use. Equipment names, manuals, images, logos, and other third-party materials remain the property of their respective owners and are credited accordingly. You may not reproduce, redistribute, or commercially exploit third-party materials without the owner\u2019s permission.',
      'Partner and institutional logos are used for identification purposes only and do not imply endorsement beyond the stated cooperation.',
    ],
  },
  {
    title: 'Acceptable use',
    paragraphs: [
      'You agree not to: interfere with the operation or security of the Platform; attempt to access the administrator area or data without authorisation; upload or transmit malicious code; scrape or bulk-collect content in a way that burdens the service; or use the Platform for unlawful purposes.',
      'We may restrict or block access if we reasonably believe these rules have been violated.',
    ],
  },
  {
    title: 'Administrator access',
    paragraphs: [
      'Administrator accounts are restricted to authorised laboratory personnel. Credentials must be kept confidential and must not be shared. You are responsible for activity carried out under your administrator session. Notify us promptly if you suspect unauthorised access.',
    ],
  },
  {
    title: 'Accuracy and availability',
    paragraphs: [
      'We aim to keep equipment information accurate and current, but content may contain errors, be incomplete, or become outdated. The Platform is provided on an "as is" and "as available" basis without warranties of any kind, to the fullest extent permitted by law.',
      'We may modify, suspend, or discontinue any part of the Platform at any time, including during maintenance or content updates.',
    ],
  },
  {
    title: 'Third-party links and content',
    paragraphs: [
      'The Platform links to external websites and embeds third-party videos. We do not control and are not responsible for external content, products, or services. Your use of third-party sites is subject to their own terms and policies.',
    ],
  },
  {
    title: 'Limitation of liability',
    paragraphs: [
      'To the fullest extent permitted by applicable law, Korea University, the LUPIC project, and the Karakalpakstan Medical Institute are not liable for any indirect, incidental, special, or consequential damages, or for loss arising from reliance on the Platform\u2019s content, use of equipment, or inability to access the Platform.',
      'Nothing in these Terms limits liability that cannot be limited under applicable law.',
    ],
  },
  {
    title: 'Changes to these terms',
    paragraphs: [
      'We may update these Terms from time to time. The revision date at the top of this page shows when they were last changed. Continued use of the Platform after changes means you accept the updated Terms.',
    ],
  },
  {
    title: 'Governing law',
    paragraphs: [
      'These Terms are governed by the laws of the Republic of Korea, without regard to conflict-of-law principles. Any dispute relating to the Platform will be subject to the jurisdiction of the competent courts in Seoul, Republic of Korea, unless mandatory law provides otherwise.',
    ],
  },
]

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Use"
      intro="The rules that apply when you use the LUPIC Laboratory Training Platform, its equipment guides, and training materials."
      updated="November 12, 2026"
      sections={SECTIONS}
      contactEmail="ku.lupic@gmail.com"
    />
  )
}

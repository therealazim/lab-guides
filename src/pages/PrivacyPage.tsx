import LegalLayout, { type LegalSection } from '../components/LegalLayout'

const SECTIONS: LegalSection[] = [
  {
    title: 'About this policy',
    paragraphs: [
      'This Privacy Policy explains how the LUPIC Laboratory Training Platform ("the Platform", "we", "us") handles information when you visit or use it. The Platform is operated as part of the LUPIC project at Korea University in cooperation with the Karakalpakstan Medical Institute (KMI).',
      'By using the Platform you agree to the practices described in this policy. If you do not agree, please do not use the Platform.',
    ],
  },
  {
    title: 'Information we collect',
    paragraphs: [
      'Public visitors can browse the Platform without creating an account. We do not sell personal information and we do not use advertising or behavioural tracking.',
      'Technical information: like most web services, our hosting infrastructure may automatically record technical data such as IP address, browser type, device type, requested pages, and timestamps. This information is used for security, diagnostics, and keeping the service available.',
      'Administrator information: authorised administrators sign in through the admin panel. Credentials are transmitted to our server for verification and are not stored in your browser. A server-side session is used to keep administrators signed in.',
      'Information you send us: if you contact us by email, we receive your email address and the content of your message so that we can respond.',
    ],
  },
  {
    title: 'Cookies and local storage',
    paragraphs: [
      'The Platform uses a session cookie for administrator authentication. This cookie is required for the admin panel to function and is not used for advertising.',
      'The Platform stores your selected language and display preferences in your browser\u2019s local storage so that your choice is remembered on your next visit. This information stays on your device and is not transmitted to us.',
      'We do not use analytics, advertising, or third-party marketing cookies.',
    ],
  },
  {
    title: 'How we use information',
    paragraphs: [
      'We use information to operate and maintain the Platform, authenticate administrators, protect against misuse, diagnose technical problems, respond to enquiries, and improve the educational content and usability of the Platform.',
    ],
  },
  {
    title: 'Third-party services and content',
    paragraphs: [
      'The Platform uses third-party services that may process technical data according to their own privacy policies: Google Fonts (typography), jsDelivr (font delivery), unpkg (animation library), and YouTube (embedded equipment tutorial videos). When you play an embedded YouTube video or open an external partner link, that provider\u2019s terms and privacy policy apply.',
      'External links to partner organisations are provided for convenience. We are not responsible for the content or privacy practices of external websites.',
    ],
  },
  {
    title: 'Data storage, retention, and security',
    paragraphs: [
      'Platform data, including equipment records, news posts, partner information, and translated interface text, is stored in a managed database operated for this project. We keep information only for as long as needed for the purposes described above or as required by applicable law.',
      'We apply reasonable technical and organisational measures to protect information, including restricted administrator access and secure session handling. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.',
    ],
  },
  {
    title: 'International processing',
    paragraphs: [
      'The Platform and its service providers may process information in countries other than your own, including the Republic of Korea and the countries where our hosting and database providers operate. We take reasonable steps to ensure information is handled consistently with this policy.',
    ],
  },
  {
    title: 'Children\u2019s privacy',
    paragraphs: [
      'The Platform is intended for students, researchers, and laboratory professionals. It is not directed to children, and we do not knowingly collect personal information from children. If you believe a child has provided information to us, please contact us so we can remove it.',
    ],
  },
  {
    title: 'Your choices and rights',
    paragraphs: [
      'You may request access to, correction of, or deletion of personal information you have provided to us, and you may object to certain processing, subject to applicable law. To make a request, contact us using the details below. We may need to verify your identity before acting on a request.',
    ],
  },
  {
    title: 'Changes to this policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. The revision date at the top of this page shows when it was last changed. Material changes will be reflected on this page.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="How the LUPIC Laboratory Training Platform handles information when you browse the site or sign in to the administrator panel."
      updated="November 12, 2026"
      sections={SECTIONS}
      contactEmail="ku.lupic@gmail.com"
    />
  )
}

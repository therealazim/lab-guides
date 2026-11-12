import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'
import PageMeta from './PageMeta'

export type LegalSection = {
  title: string
  paragraphs: string[]
}

type Props = {
  title: string
  intro: string
  updated: string
  sections: LegalSection[]
  contactEmail: string
}

export default function LegalLayout({ title, intro, updated, sections, contactEmail }: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PageMeta title={`${title} | KMI - LUPIC`} description={intro} />
      <SiteHeader />

      <section className="border-b border-lum-panel-border bg-[linear-gradient(120deg,#FDEFEC_0%,#F7F9FC_60%,#E8F0FB_100%)]">
        <div className="w-full px-4 py-14 md:px-8 md:py-16">
          <nav className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-lum-slate-warm">
            <Link to="/" className="hover:text-lum-accent">LUPIC</Link>
            <span>/</span>
            <span className="text-lum-navy">{title}</span>
          </nav>
          <h1 className="text-[clamp(1.8rem,3.4vw,2.6rem)] font-bold text-lum-navy">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-lum-slate-warm">{intro}</p>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-lum-slate-warm/80">Last updated: {updated}</p>
        </div>
      </section>

      <main className="flex-1 px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto w-full max-w-3xl">
          {sections.map((section, index) => (
            <section key={section.title} className="mb-9">
              <h2 className="mb-3 text-base font-bold text-lum-navy md:text-lg">
                {index + 1}. {section.title}
              </h2>
              {section.paragraphs.map((paragraph, i) => (
                <p key={i} className="mb-3 text-sm leading-[1.9] text-lum-slate-light">{paragraph}</p>
              ))}
            </section>
          ))}

          <div className="rounded-xl border border-lum-panel-border bg-[#F7F9FC] p-5 md:p-6">
            <h2 className="text-sm font-bold text-lum-navy">Contact</h2>
            <p className="mt-2 text-sm leading-relaxed text-lum-slate-light">
              Questions about this document? Contact the LUPIC laboratory team at{' '}
              <a href={`mailto:${contactEmail}`} className="font-semibold text-lum-accent hover:underline">{contactEmail}</a>.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/privacy" className="btn-lum-secondary">Privacy Policy</Link>
            <Link to="/terms" className="btn-lum-secondary">Terms of Use</Link>
            <Link to="/" className="btn-lum-primary">Back to Home</Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

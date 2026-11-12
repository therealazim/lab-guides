import { useEffect } from 'react'
import { Download, FileText } from 'lucide-react'
import { useI18n } from '../i18n'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import PageMeta from '../components/PageMeta'

const GUIDES = [
  { file: 'ion-chromatography-system.pdf', name: 'Ion Chromatography System', size: '4.7 MB' },
  { file: 'ultra-pure-water-system.pdf', name: 'Ultra Pure Water System', size: '0.4 MB' },
  { file: 'clean-bench.pdf', name: 'Clean Bench', size: '0.6 MB' },
  { file: 'air-sampler.pdf', name: 'Air Sampler', size: '0.3 MB' },
  { file: 'microscope.pdf', name: 'Microscope', size: '1.1 MB' },
  { file: 'environmental-monitor.pdf', name: 'Environmental Monitor', size: '0.4 MB' },
  { file: 'hotplate-stirrer.pdf', name: 'Hotplate Stirrer', size: '0.3 MB' },
  { file: 'incubator.pdf', name: 'Incubator', size: '0.4 MB' },
]

export default function DownloadPage() {
  const { t } = useI18n()

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PageMeta title={`${t('featDownloadTitle')} | ${t('title')}`} description={t('featDownloadDesc')} />
      <SiteHeader />

      <section className="border-b border-lum-panel-border bg-[linear-gradient(120deg,#FDEFEC_0%,#F7F9FC_60%,#E8F0FB_100%)]">
        <div className="w-full px-4 py-14 md:px-8 md:py-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-lum-accent">LUPIC</p>
          <h1 className="mt-3 text-[clamp(1.8rem,3.4vw,2.75rem)] font-bold leading-tight text-lum-navy">
            {t('featDownloadTitle')}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-lum-slate-warm">{t('featDownloadDesc')}</p>
        </div>
      </section>

      <main className="flex-1 px-4 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDES.map(guide => (
            <article key={guide.file} className="lum-card flex h-full flex-col p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-lum-accent-soft">
                <FileText className="h-6 w-6 text-lum-accent" />
              </span>
              <h2 className="mt-4 text-sm font-bold leading-snug text-lum-navy">{guide.name}</h2>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-lum-slate-warm">PDF · {guide.size}</p>
              <a
                href={`/guides/${guide.file}`}
                download
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-lum-navy px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#123A6E]"
              >
                <Download className="h-3.5 w-3.5" />
                {t('navDownload')}
              </a>
            </article>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Clock3 } from 'lucide-react'
import { useI18n } from '../i18n'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import PageMeta from '../components/PageMeta'

const PAGE_KEYS: Record<string, { title: string; desc: string }> = {
  '/training': { title: 'featTrainingTitle', desc: 'featTrainingDesc' },
  '/sop': { title: 'featSopTitle', desc: 'featSopDesc' },
  '/download': { title: 'featDownloadTitle', desc: 'featDownloadDesc' },
  '/certificate': { title: 'featCertificateTitle', desc: 'featCertificateDesc' },
  '/faq': { title: 'featFaqTitle', desc: 'featFaqDesc' },
  '/announcements': { title: 'featAnnouncementsTitle', desc: 'featAnnouncementsDesc' },
  '/about': { title: 'welcomeTitle', desc: 'welcomeText' },
}

export default function InfoPage() {
  const { pathname } = useLocation()
  const { t } = useI18n()
  const keys = PAGE_KEYS[pathname] || { title: 'welcomeTitle', desc: 'welcomeText' }

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PageMeta title={`${t(keys.title)} | ${t('title')}`} description={t(keys.desc)} />
      <SiteHeader />
      <section className="bg-[linear-gradient(120deg,#FDEFEC_0%,#F7F9FC_60%,#E8F0FB_100%)]">
        <div className="mx-auto w-full px-4 py-16 md:px-8 md:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-lum-accent">LUPIC</p>
          <h1 className="mt-3 text-[clamp(1.8rem,3.4vw,2.75rem)] font-bold leading-tight text-lum-navy">
            {t(keys.title)}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-lum-slate-warm">{t(keys.desc)}</p>
        </div>
      </section>

      <main className="mx-auto w-full flex-1 px-4 py-14 md:px-8">
        <div className="lum-card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lum-accent-soft">
            <Clock3 className="h-6 w-6 text-lum-accent" />
          </span>
          <h2 className="mt-5 text-lg font-bold text-lum-navy">{t('comingSoonTitle')}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-lum-slate-warm">{t('comingSoonText')}</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

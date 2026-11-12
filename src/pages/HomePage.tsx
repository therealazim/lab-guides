import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, MonitorPlay, FileText, CloudDownload, Award, MessagesSquare, Megaphone, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n, type Lang } from '../i18n'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import { fetchEquipment as apiFetchEq, fetchHiddenEquipment } from '../api'

const formatNewsDate = (value?: string) => {
  if (!value) return ''
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed)
}

const dateParts = (value?: string) => {
  if (!value) return null
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    month: new Intl.DateTimeFormat('en', { month: 'short' }).format(parsed).toUpperCase(),
    day: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(parsed),
    year: String(parsed.getFullYear()),
  }
}

const FEATURES = [
  { to: '/training', icon: MonitorPlay, title: 'featTrainingTitle', desc: 'featTrainingDesc' },
  { to: '/sop', icon: FileText, title: 'featSopTitle', desc: 'featSopDesc' },
  { to: '/download', icon: CloudDownload, title: 'featDownloadTitle', desc: 'featDownloadDesc' },
  { to: '/certificate', icon: Award, title: 'featCertificateTitle', desc: 'featCertificateDesc' },
  { to: '/faq', icon: MessagesSquare, title: 'featFaqTitle', desc: 'featFaqDesc' },
  { to: '/announcements', icon: Megaphone, title: 'featAnnouncementsTitle', desc: 'featAnnouncementsDesc' },
]

export default function HomePage() {
  const { lang, t } = useI18n()
  const [adminItems, setAdminItems] = useState<any[]>([])
  const [staticOverrides, setStaticOverrides] = useState<Record<string, any>>({})
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>(() => {
    const initial = (window as any).__INITIAL_DATA__
    return Array.isArray(initial?.hiddenEquipment) ? initial.hiddenEquipment : []
  })
  const [partners, setPartners] = useState<{ name: string; src: string; url: string }[]>([
    { name: 'Korea University', url: 'https://hes.korea.ac.kr/eng/main/main.html#HOME', src: '/logos/korea-univ.svg' },
    { name: 'KMI', url: 'https://kkmi.uz/en/', src: '/logos/kmi.svg' },
    { name: 'NRF', url: 'https://www.nrf.re.kr/index', src: '/logos/nrf.svg' },
  ])
  const [newsItems, setNewsItems] = useState<any[]>([])
  const [activeNews, setActiveNews] = useState<any | null>(null)
  const [activeImg, setActiveImg] = useState(0)

  const newsImages = (item: any): string[] => {
    const images = Array.isArray(item?.images) ? item.images.filter(Boolean) : []
    return images.length ? images : item?.image ? [item.image] : []
  }

  const openNews = (item: any) => {
    if (!item) return
    setActiveImg(0)
    setActiveNews(item)
  }

  useEffect(() => {
    if (!activeNews) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveNews(null)
      if (e.key === 'ArrowLeft') setActiveImg(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setActiveImg(i => Math.min(newsImages(activeNews).length - 1, i + 1))
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [activeNews])

  useEffect(() => {
    document.title = t('title')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('homeHeroSubtitle'))
  }, [lang, t])

  const allEquipments = useMemo(() => {
    const mergedStatic = staticEquipments
      .filter((eq: any) => !hiddenSlugs.includes(eq.slug))
      .map((eq: any) => (staticOverrides[eq.slug] ? { ...eq, ...staticOverrides[eq.slug] } : eq))
    const visibleAdminItems = adminItems.filter((item: any) => !hiddenSlugs.includes(item.slug))
    return [...mergedStatic, ...visibleAdminItems]
  }, [staticOverrides, adminItems, hiddenSlugs])

  const featuredEquipment = useMemo(() => allEquipments.slice(0, 6), [allEquipments])

  useEffect(() => {
    const initial = (window as any).__INITIAL_DATA__
    if (Array.isArray(initial?.hiddenEquipment)) setHiddenSlugs(initial.hiddenEquipment)
    if (initial?.equipment) {
      const apiOverridden = initial.equipment.filter((d: any) => d._overridden && !staticEquipments.some((s: any) => s.slug === d.slug))
      setAdminItems(apiOverridden)
      const ovs: Record<string, any> = {}
      initial.equipment.filter((d: any) => staticEquipments.some((s: any) => s.slug === d.slug)).forEach((d: any) => { ovs[d.slug] = d })
      setStaticOverrides(ovs)
    }
    async function load() {
      try {
        const eqData = await apiFetchEq()
        if (eqData) {
          const apiOverridden = eqData.filter((d: any) => d._overridden && !staticEquipments.some((s: any) => s.slug === d.slug))
          setAdminItems(apiOverridden)
          const ovs: Record<string, any> = {}
          eqData.filter((d: any) => staticEquipments.some((s: any) => s.slug === d.slug)).forEach((d: any) => { ovs[d.slug] = d })
          setStaticOverrides(ovs)
        }
      } catch {}
    }
    load()
    fetchHiddenEquipment().then(data => {
      if (Array.isArray(data)) setHiddenSlugs(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const defaults = [
      { name: 'KMI', url: 'https://kkmi.uz/en/', src: '/logos/kmi.svg' },
      { name: 'Korea University', url: 'https://hes.korea.ac.kr/eng/main/main.html#HOME', src: '/logos/korea-univ.svg' },
      { name: 'Ministry of Education', url: 'https://www.moe.go.kr/main.do?s=moe', src: '/logos/moe.svg' },
      { name: 'NRF', url: 'https://www.nrf.re.kr/index', src: '/logos/nrf.svg' },
    ]
    const initial = (window as any).__INITIAL_DATA__
    if (initial?.partners) {
      const apiPartners = initial.partners.filter((p: any) => p.name && p.image).map((p: any) => ({ name: p.name, url: p.url, src: p.image }))
      setPartners([...defaults, ...apiPartners])
    } else {
      setPartners(defaults)
    }
    async function loadPartners() {
      try {
        const r = await fetch('/api/partners')
        const data = await r.json()
        if (data?.length) {
          const apiPartners = data.filter((p: any) => p.name && p.image).map((p: any) => ({ name: p.name, url: p.url, src: p.image }))
          setPartners([...defaults, ...apiPartners])
        }
      } catch {}
    }
    loadPartners()
  }, [])

  useEffect(() => {
    const initial = (window as any).__INITIAL_DATA__
    if (initial?.news?.length) setNewsItems(initial.news)
    async function loadNews() {
      try {
        const r = await fetch('/api/news')
        const data = await r.json()
        if (data?.length) setNewsItems(data)
      } catch {}
    }
    loadNews()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-[linear-gradient(115deg,#FBE3DF_0%,#FDF0EE_28%,#F4F1F6_52%,#E6EEF8_100%)]">
        <div className="absolute inset-0">
          <img
            src="/images/hero-lab.jpg"
            alt=""
            className="h-full w-full object-cover object-center"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(251,227,223,0.96)_0%,rgba(251,227,223,0.85)_30%,rgba(240,244,250,0.55)_55%,rgba(255,255,255,0.15)_100%)]" />
        </div>

        <div className="relative mx-auto flex w-full flex-col justify-center px-4 py-16 md:min-h-[560px] md:px-8 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-lum-accent">{t('labGuide')}</p>
            <h1 className="mt-4 text-[clamp(2rem,4.4vw,3.6rem)] font-medium leading-[1.12] tracking-[-0.02em] text-lum-navy">
              {t('homeHeroLine1')}
              <br />
              <strong className="font-extrabold">{t('homeHeroLine2')}</strong>
            </h1>
            <span className="mt-6 block h-[3px] w-14 rounded-full bg-lum-accent" />
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-lum-slate-light md:text-[15px]">
              {t('homeHeroSubtitle')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              <img src="/logos/korea-univ.svg" alt="Korea University" className="h-36 w-auto" />
              <span className="hidden h-32 w-px bg-lum-navy/15 sm:block" />
              <div className="flex items-center gap-2">
                <img src="/logos/kmi.svg" alt="KMI" className="h-[132px] w-auto" />
              </div>
            </div>

            <div className="mt-9">
              <Link to="/catalog" className="btn-lum-primary">
                {t('getStarted')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── EQUIPMENT ─── */}
      <section className="mx-auto w-full px-4 py-16 md:px-8 md:py-20">
        <h2 className="lx-heading">{t('homeEquipmentTitle')}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-lum-slate-warm">{t('homeEquipmentDesc')}</p>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {featuredEquipment.map((eq: any, i: number) => {
            const d = eq[lang as Lang] || eq.en || eq
            const imgSrc = (imageMap as Record<string, string>)[eq.slug] || eq.image || ''
            return (
              <motion.div
                key={eq.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
              >
                <Link to={`/catalog/${eq.slug}`} className="group flex h-full flex-col rounded-xl border border-lum-panel-border bg-white p-4 transition-all hover:-translate-y-1 hover:border-lum-accent/40 hover:shadow-[0_14px_30px_rgba(16,35,66,0.08)]">
                  <div className="mb-4 flex h-28 items-center justify-center">
                    {imgSrc ? (
                      <img src={imgSrc} alt={d.name} className="max-h-full w-auto max-w-full object-contain transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <span className="text-3xl font-bold text-lum-slate-warm/30">{d.name?.[0]}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-lum-navy">{d.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-lum-slate-warm">{d.description}</p>
                  <span className="mt-auto flex items-center gap-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-lum-accent transition-all group-hover:gap-2.5">
                    {t('viewGuide')} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-10 text-center">
          <Link to="/catalog" className="lx-link">{t('homeViewAll')} <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      {/* ─── FEATURE CARDS ─── */}
      <section className="bg-[#F7F9FC] py-16 md:py-20">
        <div className="mx-auto grid w-full grid-cols-1 gap-5 px-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:px-8">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.to}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
            >
              <Link to={feature.to} className="lum-card group flex h-full flex-col items-center px-5 py-8 text-center">
                <feature.icon className="h-9 w-9 text-lum-navy" strokeWidth={1.4} />
                <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-lum-navy">{t(feature.title)}</h3>
                <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-lum-slate-warm">{t(feature.desc)}</p>
                <span className="mt-auto flex items-center gap-1.5 pt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-lum-accent transition-all group-hover:gap-2.5">
                  {t('learnMore')} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── WELCOME + NEWS ─── */}
      <section className="mx-auto grid w-full gap-12 px-4 py-16 md:grid-cols-[1fr_1fr] md:px-8 md:py-20 lg:gap-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="lx-heading lx-heading-left">{t('welcomeTitle')}</h2>
          <p className="mt-6 max-w-xl text-sm leading-[1.9] text-lum-slate-light">{t('welcomeText')}</p>
          <Link to="/about" className="btn-lum-secondary mt-8">{t('aboutLupic')} <ArrowRight className="h-4 w-4" /></Link>
        </motion.div>

        <div>
          <h2 className="lx-heading lx-heading-left">{t('latestNewsTitle')}</h2>
          <div className="mt-6 divide-y divide-lum-panel-border">
            {newsItems.slice(0, 3).map((item: any, i: number) => {
              const parts = dateParts(item.upload_date || item.created_at)
              return (
                <motion.article
                  key={item.id ?? i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  role="button"
                  tabIndex={0}
                  onClick={() => openNews(item)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNews(item) } }}
                  className="group flex cursor-pointer gap-5 py-5 first:pt-0"
                >
                  <div className="flex h-16 w-14 flex-shrink-0 flex-col items-center justify-center rounded-md border border-lum-panel-border bg-lum-soft text-lum-navy">
                    {parts ? (
                      <>
                        <span className="text-[9px] font-bold tracking-[0.1em] text-lum-slate-warm">{parts.month}</span>
                        <span className="text-lg font-bold leading-none">{parts.day}</span>
                        <span className="mt-0.5 text-[9px] text-lum-slate-warm">{parts.year}</span>
                      </>
                    ) : (
                      <Megaphone className="h-5 w-5 text-lum-accent" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-snug text-lum-navy group-hover:text-lum-accent">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-lum-slate-warm">
                      {item.description || t('newsUpdatesSoonDesc')}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-lum-accent transition-all group-hover:gap-2.5">
                      {t('readMore')} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </motion.article>
              )
            })}
            {newsItems.length === 0 && (
              <div className="py-6">
                <h3 className="text-sm font-semibold text-lum-navy">{t('newsUpdatesSoon')}</h3>
                <p className="mt-1 text-sm leading-relaxed text-lum-slate-warm">{t('newsUpdatesSoonDesc')}</p>
              </div>
            )}
          </div>
          {newsItems.length === 0 && (
            <p className="mt-2 text-[11px] text-lum-slate-warm/80">{formatNewsDate(new Date().toISOString())}</p>
          )}
        </div>
      </section>

      {/* ─── NEWS READER ─── */}
      <AnimatePresence>
        {activeNews && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-lum-navy/45 p-4 backdrop-blur-sm md:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={activeNews.title}
            onClick={() => setActiveNews(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-lum-panel-border px-5 py-4 md:px-7">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lum-accent">{formatNewsDate(activeNews.upload_date || activeNews.created_at) || t('latestNewsTitle')}</p>
                  <h2 className="mt-1 text-lg font-bold leading-snug text-lum-navy md:text-xl">{activeNews.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNews(null)}
                  aria-label={t('close')}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-lum-panel-border text-lum-slate-warm transition-colors hover:bg-lum-soft hover:text-lum-navy"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-5 md:px-7">
                {(() => {
                  const images = newsImages(activeNews)
                  if (!images.length) return null
                  const current = Math.min(activeImg, images.length - 1)
                  return (
                    <div className="mb-6">
                      <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-[#F7F9FC]">
                        <img src={images[current]} alt={activeNews.title} className="max-h-[46vh] w-full object-contain" />
                        {images.length > 1 && (
                          <>
                            <button type="button" onClick={() => setActiveImg(Math.max(0, current - 1))} disabled={current === 0} aria-label={t('previousImage')} className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-lum-navy shadow-md transition-colors hover:bg-white disabled:opacity-35">
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button type="button" onClick={() => setActiveImg(Math.min(images.length - 1, current + 1))} disabled={current === images.length - 1} aria-label={t('nextImage')} className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-lum-navy shadow-md transition-colors hover:bg-white disabled:opacity-35">
                              <ChevronRight className="h-5 w-5" />
                            </button>
                            <span className="absolute bottom-2 right-3 rounded-full bg-lum-navy/70 px-2.5 py-1 text-[10px] font-semibold text-white">{current + 1} / {images.length}</span>
                          </>
                        )}
                      </div>
                      {images.length > 1 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                          {images.map((image: string, index: number) => (
                            <button key={`${image}-${index}`} type="button" onClick={() => setActiveImg(index)} aria-label={`${t('newsImage')} ${index + 1}`} className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${current === index ? 'border-lum-accent' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                              <img src={image} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                <p className="whitespace-pre-line text-sm leading-[1.9] text-lum-slate-light">
                  {activeNews.description || t('newsUpdatesSoonDesc')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PARTNERS ─── */}
      <section className="border-t border-lum-panel-border bg-white py-12">
        <div className="mx-auto flex w-full flex-wrap items-center justify-center gap-x-14 gap-y-8 px-4 md:px-8">
          {partners.map((partner, i) => (
            <a
              key={`${partner.name}-${i}`}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center opacity-70 transition-opacity hover:opacity-100"
            >
              <img src={partner.src} alt={partner.name} className="h-28 w-auto object-contain md:h-32" />
            </a>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

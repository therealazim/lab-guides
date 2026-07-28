import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, ListOrdered, Wrench, Info, MapPin, Hash, Tag, ShoppingCart, Package, BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useI18n, type Lang } from '../i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'
import ThemeToggle from '../components/ThemeToggle'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import youtubeVideos from '../data/youtube-videos.json'
import { fetchEquipmentBySlug as apiFetchEq } from '../api'

const findEquipment = (slug: string) => {
  const fromStatic = staticEquipments.find((eq: any) => eq.slug === slug)
  if (fromStatic) return fromStatic
  return undefined
}
const getMeta = (slug: string) => {
  const eq = findEquipment(slug) as any
  if (!eq) return { brand: '', model: '', location: '', quantity: '', purchase_date: '', installation_date: '', status: '' }
  return {
    brand: eq.brand || '',
    model: eq.model || '',
    location: eq.location || '',
    quantity: eq.quantity || '',
    purchase_date: eq.purchase_date || '',
    installation_date: eq.installation_date || '',
    status: eq.status || '',
  }
}

const silkEase = [0.16, 1, 0.3, 1] as const

function InfoBadge({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-lum-panel-bg border border-lum-panel-border backdrop-blur-xl">
      <Icon className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] tracking-[0.15em] uppercase text-lum-slate-warm/70">{label}</p>
        <p className="text-xs font-medium text-lum-ivory truncate">{value}</p>
      </div>
    </div>
  )
}

export default function EquipmentPage() {
  const { slug } = useParams<{ slug: string }>()
  const { lang, t } = useI18n()
  const [apiEquipment, setApiEquipment] = useState<any>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    // Fetch from API if available
    if (slug) {
      apiFetchEq(slug).then(data => { if (data) setApiEquipment(data) }).catch(() => {})
    }
  }, [slug])
  
  const equipment = apiEquipment || findEquipment(slug || '')
  const meta = getMeta(slug || '')

  if (!equipment) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F1115' }}>
        <p className="text-lum-slate-light/60 text-lg font-light">{t('noResults')}</p>
      </div>
    )
  }

  const data = equipment[lang as Lang] || equipment.en
  const adminImg = (equipment as any)?.image || ''
  const imgSrc = (imageMap as Record<string, string>)[slug || ''] || adminImg || ''
  const videoUrlRaw = (youtubeVideos as Record<string, string>)[slug || ''] || ''
  const videoUrl = videoUrlRaw.includes('/embed/') ? videoUrlRaw.split('/embed/')[1] : videoUrlRaw

  return (
    <div className="relative z-10 min-h-screen">
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 bg-lum-mid/80 backdrop-blur-xl border-b border-lum-panel-border">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.a
              href="/#/"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1 p-2 -ml-2 text-lum-slate-warm hover:text-lum-ivory transition-colors text-xs tracking-[0.15em] uppercase"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-lum-ivory/70" />
              <span>{t('back')}</span>
            </motion.a>
            {/* Logo on mobile - next to back button */}
            <a href="/#/" onClick={() => sessionStorage.setItem('homeScrollY', String(window.scrollY))} className="sm:hidden">
              <img src="/korea-univ-logo.svg" alt="Korea University" className="h-8 w-auto" />
            </a>
          </div>

          {/* Center logo & branding - desktop only */}
          <a
            href="/#/"
            onClick={() => sessionStorage.setItem('homeScrollY', String(window.scrollY))}
            className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center gap-2"
          >
            <img src="/korea-univ-logo.svg" alt="Korea University" className="h-9 w-auto" />
            <div>
              <p className="text-[11px] font-bold text-lum-ivory leading-tight">고려대학교 IEH</p>
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-lum-slate-light/70">KMI - LUPIC</span>
            </div>
          </a>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="w-full px-8 md:px-12 lg:px-16 py-12 pt-20">
        {/* ─── HERO ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: silkEase }}
          className="mb-16"
        >
          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Image */}
            <div className="lum-card p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-48 md:min-h-64 lg:min-h-80">
              {imgSrc ? (
                <img src={imgSrc} alt={data.name} className="w-full h-full object-contain max-h-72" />
              ) : (
                <Package className="w-24 h-24 text-lum-slate-light/40" />
              )}
            </div>

            {/* Info */}
            <div>
              <p className="section-tag">{t('heroTagline')}</p>
              <h1 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-light tracking-[-0.04em] leading-[1.15] text-lum-ivory mb-4">
                <strong className="font-semibold">{data.name}</strong>
              </h1>
              <p className="text-sm font-light leading-relaxed text-lum-slate-light mb-8">
                {data.description}
              </p>

              {/* Meta badges */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {meta.brand && <InfoBadge icon={Tag} label={t('brand')} value={meta.brand} />}
                {meta.model && <InfoBadge icon={Info} label={t('model')} value={meta.model} />}
                {meta.quantity && <InfoBadge icon={Hash} label={t('quantity')} value={meta.quantity} />}
                {meta.location && <InfoBadge icon={MapPin} label={t('location')} value={meta.location.replace(/Room (\d+)/, (_: string, n: string) => t('room').replace('{n}', n))} />}
                {meta.purchase_date && meta.purchase_date !== 'None' && (
                  <InfoBadge icon={ShoppingCart} label={t('purchaseDate')} value={meta.purchase_date} />
                )}
                {meta.installation_date && meta.installation_date !== 'None' && (
                  <InfoBadge icon={Package} label={t('installationDate')} value={meta.installation_date} />
                )}
                {meta.status && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-lum-panel-bg border border-lum-panel-border backdrop-blur-xl">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      meta.status === 'AVIABLE' ? 'bg-emerald-400' : 'bg-red-400'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-[9px] tracking-[0.15em] uppercase text-lum-slate-warm/70">{t('status')}</p>
                      <p className="text-xs font-medium text-lum-ivory truncate">{meta.status}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── CONTENT SECTIONS ─── */}
        {[
          { key: 'purpose', icon: BookOpen, title: t('purpose'), content: data.purpose, color: 'border-l-lum-slate-light/30' },
          { key: 'specifications', icon: Info, title: t('specifications'), content: data.specifications, color: 'border-l-lum-slate-light/30' },
        ].map((section, i) => (
          <motion.section
            key={section.key}
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: silkEase, delay: i * 0.1 }}
            className="lum-card p-4 md:p-6 lg:p-8 mb-6 border-l-2 border-l-lum-slate-light/20"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-lum-graphite border border-lum-panel-border flex items-center justify-center">
                <section.icon className="w-4 h-4 text-lum-slate-light" />
              </div>
              <h2 className="text-base font-semibold text-lum-ivory tracking-tight">{section.title}</h2>
            </div>
            <div className="tiptap text-sm font-light leading-relaxed text-lum-slate-light" dangerouslySetInnerHTML={{ __html: section.content }} />
          </motion.section>
        ))}

        {/* Safety */}
        <motion.section
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: silkEase, delay: 0.2 }}
          className="lum-card p-4 md:p-6 lg:p-8 mb-6 border-l-2 border-l-red-500/30"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-lum-ivory tracking-tight">{t('safety')}</h2>
          </div>
          <div className="tiptap text-sm font-light leading-relaxed text-lum-slate-light" dangerouslySetInnerHTML={{ __html: (data as any).safety || (Array.isArray((data as any).safetyGuidelines) ? (data as any).safetyGuidelines.join('<br>') : '') }} />
        </motion.section>

        {/* Procedure */}
        <motion.section
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: silkEase, delay: 0.3 }}
          className="lum-card p-4 md:p-6 lg:p-8 mb-6 border-l-2 border-l-emerald-500/30"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ListOrdered className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-base font-semibold text-lum-ivory tracking-tight">{t('procedure')}</h2>
          </div>
          <div className="tiptap text-sm font-light leading-relaxed text-lum-slate-light" dangerouslySetInnerHTML={{ __html: (data as any).procedure || (Array.isArray((data as any).operatingProcedure) ? (data as any).operatingProcedure.join('<br>') : '') }} />
        </motion.section>

        {/* Maintenance */}
        <motion.section
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: silkEase, delay: 0.4 }}
          className="lum-card p-4 md:p-6 lg:p-8 mb-6 border-l-2 border-l-amber-500/30"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-base font-semibold text-lum-ivory tracking-tight">{t('maintenance')}</h2>
          </div>
          <div className="tiptap text-sm font-light leading-relaxed text-lum-slate-light" dangerouslySetInnerHTML={{ __html: (data as any).maintenance || (Array.isArray((data as any).maintenance) ? (data as any).maintenance.join('<br>') : '') }} />
        </motion.section>

        {/* Video Tutorial */}
        {videoUrl && (
          <motion.section
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: silkEase, delay: 0.5 }}
            className="lum-card p-4 md:p-6 lg:p-8 mb-6"
          >
            <h2 className="text-base font-semibold text-lum-ivory tracking-tight mb-6">{t('videoTutorial')}</h2>
            <div className="aspect-video rounded-2xl overflow-hidden border border-lum-panel-border max-w-3xl mx-auto">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoUrl}`}
                title={t('videoTitle')}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </motion.section>
        )}

        {/* ─── FOOTER ─── */}
        <footer className="text-center py-12 border-t border-lum-panel-border mt-16">
          <p className="text-[10px] tracking-[0.15em] uppercase text-lum-slate-warm/80">
            &copy; 2026 <span className="text-lum-slate-light font-semibold">KMI / LUPIC Laboratory</span>
          </p>
          <p className="text-[11px] text-lum-slate-warm/50 mt-3 max-w-2xl mx-auto leading-relaxed">
            All information, media, and images on this site are credited to their respective owners. Use of materials is for educational purposes only.
          </p>
        </footer>
      </main>
    </div>
  )
}
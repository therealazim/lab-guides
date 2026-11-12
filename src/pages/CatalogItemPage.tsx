import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Tag, Info, MapPin, Hash, ShoppingCart, Package, FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useI18n, type Lang } from '../i18n'
import SiteHeader from '../components/SiteHeader'
import PageMeta from '../components/PageMeta'
import SiteFooter from '../components/SiteFooter'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import { fetchEquipmentBySlug as apiFetchEq, fetchHiddenEquipment } from '../api'

export default function CatalogItemPage() {
  const { slug } = useParams<{ slug: string }>()
  const { lang, t } = useI18n()
  const [apiEquipment, setApiEquipment] = useState<any>(null)
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>(() => {
    const initial = (window as any).__INITIAL_DATA__
    return Array.isArray(initial?.hiddenEquipment) ? initial.hiddenEquipment : []
  })
  const [hiddenLoaded, setHiddenLoaded] = useState(() => {
    const initial = (window as any).__INITIAL_DATA__
    return Array.isArray(initial?.hiddenEquipment)
  })

  useEffect(() => {
    window.scrollTo(0, 0)
    if (slug) apiFetchEq(slug).then(d => { if (d) setApiEquipment(d) }).catch(() => {})
    fetchHiddenEquipment().then(data => {
      if (Array.isArray(data)) setHiddenSlugs(data)
    }).catch(() => {}).finally(() => setHiddenLoaded(true))
  }, [slug])

  const isHidden = Boolean(slug && hiddenSlugs.includes(slug))
  const equipment = hiddenLoaded && !isHidden ? (apiEquipment || staticEquipments.find((e: any) => e.slug === slug)) : undefined

  const manualBlobUrl = useMemo(() => {
    if (!equipment?.manual) return null
    try {
      const base64 = equipment.manual.split(',')[1] || ''
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    } catch {
      return null
    }
  }, [equipment?.manual])

  useEffect(() => {
    return () => { if (manualBlobUrl) URL.revokeObjectURL(manualBlobUrl) }
  }, [manualBlobUrl])

  if (!hiddenLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-lum-panel-border border-t-lum-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-lum-slate-warm text-lg">{t('noResults')}</p>
      </div>
    )
  }

  const d = equipment[lang as Lang] || equipment.en || equipment
  const imgSrc = (imageMap as Record<string, string>)[slug || ''] || equipment.image || ''
  const statusKey = ({ AVAILABLE: 'statusAvailable', IN_USE: 'statusInUse', MAINTENANCE: 'statusMaintenance', OUT_OF_SERVICE: 'statusOutOfService', UNAVAILABLE: 'statusUnavailable', UNKNOWN: 'statusUnknown' } as Record<string, string>)[String(equipment.status || '').toUpperCase()] || 'statusUnknown'

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PageMeta title={`${d.name} | ${t('equipmentCatalog')}`} description={`${d.name} — laboratory equipment details, status, and manual.`} />
      <SiteHeader />

      <main className="mx-auto w-full flex-1 px-4 py-10 md:px-8 md:py-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
          <div className="lum-card p-6 md:p-8 flex flex-col items-center text-center mb-6">
            {imgSrc ? (
              <div className="flex h-48 w-full items-center justify-center rounded-lg bg-[#F7F9FC] p-4 mb-6">
                <img src={imgSrc} alt={d.name} className="max-h-full w-auto object-contain" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-lum-soft flex items-center justify-center mb-6">
                <span className="text-3xl font-semibold text-lum-slate-warm/40">{d.name?.[0]}</span>
              </div>
            )}
            <h1 className="text-xl font-bold text-lum-navy">{d.name}</h1>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {equipment.brand && equipment.brand !== '—' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
                <Tag className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">{t('brand')}</p><p className="text-xs font-medium text-lum-ivory">{equipment.brand}</p></div>
              </div>
            )}
            {equipment.model && equipment.model !== '—' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
                <Info className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">{t('model')}</p><p className="text-xs font-medium text-lum-ivory">{equipment.model}</p></div>
              </div>
            )}
            {equipment.quantity && equipment.quantity !== '—' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
                <Hash className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">{t('quantity')}</p><p className="text-xs font-medium text-lum-ivory">{equipment.quantity}</p></div>
              </div>
            )}
            {equipment.location && equipment.location !== '—' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
                <MapPin className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">{t('location')}</p><p className="text-xs font-medium text-lum-ivory">{equipment.location}</p></div>
              </div>
            )}
            {equipment.purchase_date && equipment.purchase_date !== '—' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
                <ShoppingCart className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">{t('purchaseDate')}</p><p className="text-xs font-medium text-lum-ivory">{equipment.purchase_date}</p></div>
              </div>
            )}
            {equipment.installation_date && equipment.installation_date !== '—' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
                <Package className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">{t('installationDate')}</p><p className="text-xs font-medium text-lum-ivory">{equipment.installation_date}</p></div>
              </div>
            )}
            {equipment.status && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border col-span-2">
                <span className={`w-2.5 h-2.5 rounded-full ${equipment.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">{t('status')}</p><p className="text-xs font-medium text-lum-ivory">{t(statusKey)}</p></div>
              </div>
            )}
          </div>

          {equipment.manual && manualBlobUrl && (
            <div className="mt-6 text-center">
              <a
                href={manualBlobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-lum-accent text-white hover:bg-[#E0513F] text-xs font-semibold uppercase tracking-[0.12em] transition-colors"
              >
                <FileText className="w-4 h-4" />
                {t('viewManual')}
              </a>
            </div>
          )}
        </motion.div>
      </main>
      <SiteFooter />
    </div>
  )
}

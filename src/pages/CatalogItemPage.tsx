import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Tag, Info, MapPin, Hash, ShoppingCart, Package, FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useI18n, type Lang } from '../i18n'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import { fetchEquipmentBySlug as apiFetchEq } from '../api'

export default function CatalogItemPage() {
  const { slug } = useParams<{ slug: string }>()
  const { lang, t } = useI18n()
  const [apiEquipment, setApiEquipment] = useState<any>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (slug) apiFetchEq(slug).then(d => { if (d) setApiEquipment(d) }).catch(() => {})
  }, [slug])

  const equipment = apiEquipment || staticEquipments.find((e: any) => e.slug === slug)

  const manualBlobUrl = useMemo(() => {
    if (!equipment?.manual) return null
    const base64 = equipment.manual.split(',')[1] || ''
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  }, [equipment?.manual])

  useEffect(() => {
    return () => { if (manualBlobUrl) URL.revokeObjectURL(manualBlobUrl) }
  }, [manualBlobUrl])

  if (!equipment) return null

  const d = equipment[lang as Lang] || equipment.en
  const imgSrc = (imageMap as Record<string, string>)[slug || ''] || equipment.image || ''

  return (
    <div className="relative z-10 min-h-screen" style={{ background: '#0F1115' }}>
      <header className="sticky top-0 z-50 bg-lum-mid/80 backdrop-blur-xl border-b border-lum-panel-border">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <Link to="/catalog" className="flex items-center gap-1 text-lum-slate-warm hover:text-lum-ivory transition-colors text-xs tracking-[0.15em] uppercase">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Catalog
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="w-full px-8 md:px-12 lg:px-16 py-12 pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
          <div className="lum-card p-6 md:p-8 flex flex-col items-center text-center mb-6">
            {imgSrc ? (
              <img src={imgSrc} alt={d.name} className="h-40 w-auto object-contain mb-6" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-lum-soft flex items-center justify-center mb-6">
                <span className="text-3xl font-semibold text-lum-slate-warm/40">{d.name?.[0]}</span>
              </div>
            )}
            <h1 className="text-xl font-semibold text-lum-ivory">{d.name}</h1>
            <p className="text-xs text-lum-slate-warm/60 mt-1">Slug: {slug}</p>
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
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Model</p><p className="text-xs font-medium text-lum-ivory">{equipment.model}</p></div>
              </div>
            )}
            {equipment.quantity && equipment.quantity !== '—' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
                <Hash className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Qty</p><p className="text-xs font-medium text-lum-ivory">{equipment.quantity}</p></div>
              </div>
            )}
            {equipment.location && equipment.location !== '—' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
                <MapPin className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Location</p><p className="text-xs font-medium text-lum-ivory">{equipment.location}</p></div>
              </div>
            )}
            {equipment.purchase_date && equipment.purchase_date !== '—' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
                <ShoppingCart className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Purchased</p><p className="text-xs font-medium text-lum-ivory">{equipment.purchase_date}</p></div>
              </div>
            )}
            {equipment.installation_date && equipment.installation_date !== '—' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
                <Package className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Installed</p><p className="text-xs font-medium text-lum-ivory">{equipment.installation_date}</p></div>
              </div>
            )}
            {equipment.status && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border col-span-2">
                <span className={`w-2.5 h-2.5 rounded-full ${equipment.status === 'AVAILABLE' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div><p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Status</p><p className="text-xs font-medium text-lum-ivory">{equipment.status}</p></div>
              </div>
            )}
          </div>

          {equipment.manual && manualBlobUrl && (
            <div className="mt-6 text-center">
              <a
                href={manualBlobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-lum-slate-light/10 hover:bg-lum-slate-light/20 text-lum-ivory text-sm font-medium transition-colors border border-lum-panel-border"
              >
                <FileText className="w-4 h-4" />
                View Manual
              </a>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react'
import { useI18n, type Lang } from '../i18n'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import { fetchEquipment as apiFetchEq, fetchHiddenEquipment } from '../api'

export default function CatalogPage() {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const [adminItems, setAdminItems] = useState<any[]>([])
  const [staticOverrides, setStaticOverrides] = useState<Record<string, any>>({})
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>(() => {
    const initial = (window as any).__INITIAL_DATA__
    return Array.isArray(initial?.hiddenEquipment) ? initial.hiddenEquipment : []
  })
  const [mouse, setMouse] = useState({ x: 50, y: 50 })
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => {
    document.title = `${t('equipmentCatalog')} | ${t('title')}`
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('subtitle'))
    return () => { document.title = t('title') }
  }, [lang, t])

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
    const onMove = (e: MouseEvent) => setMouse({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const allEquipments = useMemo(() => {
    const merged = staticEquipments
      .filter((eq: any) => !hiddenSlugs.includes(eq.slug))
      .map((eq: any) => staticOverrides[eq.slug] ? { ...eq, ...staticOverrides[eq.slug] } : eq)
    const visibleAdminItems = adminItems.filter((item: any) => !hiddenSlugs.includes(item.slug))
    return [...merged, ...visibleAdminItems]
  }, [staticOverrides, adminItems, hiddenSlugs])

  const filteredEquipment = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...allEquipments]
      .filter((eq: any) => {
        const d = eq[lang as Lang] || eq.en || eq
        const searchable = [d.name, d.description, eq.brand, eq.model, eq.location, eq.slug].filter(Boolean).join(' ').toLowerCase()
        return (!q || searchable.includes(q)) && (statusFilter === 'ALL' || (eq.status || '').toUpperCase() === statusFilter)
      })
      .sort((a: any, b: any) => {
        const aData = a[lang as Lang] || a.en || a
        const bData = b[lang as Lang] || b.en || b
        if (sortBy === 'brand') return String(a.brand || '').localeCompare(String(b.brand || ''))
        if (sortBy === 'status') return String(a.status || '').localeCompare(String(b.status || '')) || String(aData.name || '').localeCompare(String(bData.name || ''))
        return String(aData.name || '').localeCompare(String(bData.name || ''))
      })
  }, [allEquipments, lang, query, sortBy, statusFilter])

  return (
    <div className="relative z-10 min-h-screen">
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          WebkitMaskImage: `radial-gradient(circle 400px at ${mouse.x}% ${mouse.y}%, rgba(0,0,0,0.8) 0%, transparent 60%)`,
          maskImage: `radial-gradient(circle 400px at ${mouse.x}% ${mouse.y}%, rgba(0,0,0,0.8) 0%, transparent 60%)`,
        }}
      />

      <header className="fixed top-0 left-0 right-0 z-50 bg-lum-mid/80 backdrop-blur-xl border-b border-lum-panel-border">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <a href="/#/"><img src="/korea-univ-logo.svg" alt="Korea University" className="h-9 sm:h-12 w-auto" /></a>
            <div className="hidden sm:block min-w-0">
              <p className="text-xs font-bold text-lum-ivory">고려대학교 IEH</p>
              <span className="text-lum-ivory font-bold text-xs tracking-[0.2em] uppercase">KMI - LUPIC</span>
            </div>
            <Link to="/" aria-label={t('back')} className="flex items-center gap-1 px-2.5 py-2.5 min-h-11 text-lum-slate-warm hover:text-lum-ivory transition-colors text-xs tracking-[0.15em] uppercase shrink-0">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('back')}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="pt-24 px-4 sm:px-8 md:px-12 lg:px-16 pb-12 sm:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-[9px] font-semibold tracking-[0.3em] uppercase text-lum-slate-warm/60 mb-3">{t('equipmentCatalog')}</p>
          <h1 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-light tracking-[-0.04em] text-lum-ivory">
            {t('allEquipment')} <strong className="font-semibold">({filteredEquipment.length})</strong>
          </h1>
          <p className="text-xs text-lum-slate-warm/60 mt-3">{t('showing')} {filteredEquipment.length} {t('of')} {allEquipments.length} {t('equipmentGuides')}</p>
        </motion.div>

        <div className="lum-card p-3 md:p-4 mb-6 flex flex-col md:flex-row gap-3">
          <label className="relative flex-1">
            <span className="sr-only">{t('search')}</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lum-slate-warm/50" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('searchCatalog')} className="w-full pl-10 pr-4 py-3 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory placeholder:text-lum-slate-warm/50 outline-none focus:border-lum-slate-light/30" />
          </label>
          <label className="relative md:w-48">
            <span className="sr-only">{t('filterByStatus')}</span>
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lum-slate-warm/50 pointer-events-none" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory outline-none">
              <option value="ALL">{t('allStatuses')}</option>
              <option value="AVAILABLE">{t('statusAvailable')}</option>
              <option value="IN_USE">{t('statusInUse')}</option>
              <option value="MAINTENANCE">{t('statusMaintenance')}</option>
              <option value="OUT_OF_SERVICE">{t('statusOutOfService')}</option>
            </select>
          </label>
          <label className="md:w-48">
            <span className="sr-only">{t('sortEquipment')}</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory outline-none">
              <option value="name">{t('sortName')}</option>
              <option value="brand">{t('sortManufacturer')}</option>
              <option value="status">{t('sortStatus')}</option>
            </select>
          </label>
        </div>

        {filteredEquipment.length === 0 ? (
          <div className="lum-card p-10 text-center">
            <p className="text-lum-ivory font-medium">{t('noEquipmentMatches')}</p>
            <p className="text-sm text-lum-slate-warm/60 mt-2">{t('tryDifferentFilters')}</p>
            <button type="button" onClick={() => { setQuery(''); setStatusFilter('ALL') }} className="btn-lum-secondary mt-5">{t('resetFilters')}</button>
          </div>
        ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredEquipment.map((eq: any, i: number) => {
            const d = eq[lang as Lang] || eq.en || eq
            const imgSrc = (imageMap as Record<string, string>)[eq.slug] || eq.image || ''
            return (
              <motion.div
                key={eq.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/catalog/${eq.slug}`)}
                className="lum-card p-3 cursor-pointer hover:border-lum-slate-light/20 transition-all group"
              >
                <div className="aspect-square rounded-xl bg-lum-mid border border-lum-panel-border flex items-center justify-center p-3 mb-3 overflow-hidden">
                  {imgSrc ? (
                    <img src={imgSrc} alt={d.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-lum-soft flex items-center justify-center">
                      <span className="text-lg font-semibold text-lum-slate-warm/40">{d.name?.[0]}</span>
                    </div>
                  )}
                </div>
                {eq.brand && eq.brand !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">{eq.brand}</p>}
                {eq.model && eq.model !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">{eq.model}</p>}
                {eq.quantity && eq.quantity !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">{t('quantity')}: {eq.quantity}</p>}
                {eq.location && eq.location !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">{eq.location}</p>}
                {eq.purchase_date && eq.purchase_date !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">{t('purchaseDate')}: {eq.purchase_date}</p>}
                {eq.installation_date && eq.installation_date !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">{t('installationDate')}: {eq.installation_date}</p>}
                {eq.status && (
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-medium ${
                    eq.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {t(({ AVAILABLE: 'statusAvailable', IN_USE: 'statusInUse', MAINTENANCE: 'statusMaintenance', OUT_OF_SERVICE: 'statusOutOfService', UNAVAILABLE: 'statusUnavailable', UNKNOWN: 'statusUnknown' } as Record<string, string>)[String(eq.status).toUpperCase()] || 'statusUnknown')}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
        )}
      </main>
    </div>
  )
}

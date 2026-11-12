import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useI18n, type Lang } from '../i18n'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
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
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-10 md:px-8 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="section-tag">{t('equipmentCatalog')}</p>
          <h1 className="text-[clamp(1.7rem,3vw,2.4rem)] font-bold tracking-[-0.02em] text-lum-navy">
            {t('allEquipment')} <span className="text-lum-slate-warm">({filteredEquipment.length})</span>
          </h1>
          <p className="mt-2 text-sm text-lum-slate-warm">{t('showing')} {filteredEquipment.length} {t('of')} {allEquipments.length} {t('equipmentGuides')}</p>
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
                className="lum-card p-3 cursor-pointer group"
              >
                <div className="aspect-square rounded-lg bg-[#F7F9FC] border border-lum-panel-border flex items-center justify-center p-3 mb-3 overflow-hidden">
                  {imgSrc ? (
                    <img src={imgSrc} alt={d.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-lum-soft flex items-center justify-center">
                      <span className="text-lg font-semibold text-lum-slate-warm/40">{d.name?.[0]}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-lum-navy truncate">{d.name}</p>
                {eq.status && (
                  <span className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                    eq.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${eq.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {t(({ AVAILABLE: 'statusAvailable', IN_USE: 'statusInUse', MAINTENANCE: 'statusMaintenance', OUT_OF_SERVICE: 'statusOutOfService', UNAVAILABLE: 'statusUnavailable', UNKNOWN: 'statusUnknown' } as Record<string, string>)[String(eq.status).toUpperCase()] || 'statusUnknown')}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

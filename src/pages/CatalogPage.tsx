import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Tag, Info, MapPin, Hash, ShoppingCart, Package } from 'lucide-react'
import { useI18n, type Lang } from '../i18n'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import { fetchEquipment as apiFetchEq } from '../api'

export default function CatalogPage() {
  const { lang, t } = useI18n()
  const [adminItems, setAdminItems] = useState<any[]>([])
  const [staticOverrides, setStaticOverrides] = useState<Record<string, any>>({})
  const [mouse, setMouse] = useState({ x: 50, y: 50 })
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    const initial = (window as any).__INITIAL_DATA__
    if (initial?.equipment) {
      const apiOverridden = initial.equipment.filter((d: any) => d._overridden)
      setAdminItems(apiOverridden)
      const ovs: Record<string, any> = {}
      initial.equipment.filter((d: any) => staticEquipments.some((s: any) => s.slug === d.slug)).forEach((d: any) => { ovs[d.slug] = d })
      setStaticOverrides(ovs)
    }
    async function load() {
      try {
        const eqData = await apiFetchEq()
        if (eqData) {
          const apiOverridden = eqData.filter((d: any) => d._overridden)
          setAdminItems(apiOverridden)
          const ovs: Record<string, any> = {}
          eqData.filter((d: any) => staticEquipments.some((s: any) => s.slug === d.slug)).forEach((d: any) => { ovs[d.slug] = d })
          setStaticOverrides(ovs)
        }
      } catch {}
    }
    load()
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    if (selected) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [selected])

  const allEquipments = useMemo(() => {
    const merged = staticEquipments.map((eq: any) =>
      staticOverrides[eq.slug] ? { ...eq, ...staticOverrides[eq.slug] } : eq
    )
    return [...merged, ...adminItems]
  }, [staticOverrides, adminItems])

  const selectedData = selected ? ((selected[lang as Lang] || selected.en) as any) : null

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
          <div className="flex items-center gap-3">
            <a href="/#/"><img src="/korea-univ-logo.svg" alt="Korea University" className="h-12 w-auto" /></a>
            <div>
              <p className="text-xs font-bold text-lum-ivory">고려대학교 IEH</p>
              <span className="text-lum-ivory font-bold text-xs tracking-[0.2em] uppercase">KMI - LUPIC</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="pt-24 px-8 md:px-12 lg:px-16 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-[9px] font-semibold tracking-[0.3em] uppercase text-lum-slate-warm/60 mb-3">Equipment Catalog</p>
          <h1 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-light tracking-[-0.04em] text-lum-ivory">
            All Equipment <strong className="font-semibold">({allEquipments.length})</strong>
          </h1>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allEquipments.map((eq: any, i: number) => {
            const d = eq[lang as Lang] || eq.en
            const imgSrc = (imageMap as Record<string, string>)[eq.slug] || eq.image || ''
            return (
              <motion.div
                key={eq.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(eq)}
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
                {eq.quantity && eq.quantity !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">Qty: {eq.quantity}</p>}
                {eq.location && eq.location !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">{eq.location}</p>}
                {eq.purchase_date && eq.purchase_date !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">Purchased: {eq.purchase_date}</p>}
                {eq.installation_date && eq.installation_date !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">Installed: {eq.installation_date}</p>}
                {eq.status && (
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-medium ${
                    eq.status === 'AVIABLE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {eq.status}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      </main>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && selectedData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15,17,21,0.85)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="lum-card p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-lum-soft hover:bg-lum-graphite transition-colors">
                <X className="w-4 h-4 text-lum-slate-warm" />
              </button>

              <div className="flex flex-col items-center text-center mb-6">
                {(() => {
                  const imgSrc = (imageMap as Record<string, string>)[selected.slug] || selected.image || ''
                  return imgSrc ? (
                    <img src={imgSrc} alt={selectedData.name} className="h-32 w-auto object-contain mb-4" />
                  ) : null
                })()}
                <h2 className="text-lg font-semibold text-lum-ivory">{selectedData.name}</h2>
                <p className="text-xs text-lum-slate-warm/60 mt-1">{selected.slug}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {selected.brand && selected.brand !== '—' && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-lum-soft border border-lum-panel-border">
                    <Tag className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Brand</p>
                      <p className="text-xs font-medium text-lum-ivory truncate">{selected.brand}</p>
                    </div>
                  </div>
                )}
                {selected.model && selected.model !== '—' && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-lum-soft border border-lum-panel-border">
                    <Info className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Model</p>
                      <p className="text-xs font-medium text-lum-ivory truncate">{selected.model}</p>
                    </div>
                  </div>
                )}
                {selected.quantity && selected.quantity !== '—' && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-lum-soft border border-lum-panel-border">
                    <Hash className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Qty</p>
                      <p className="text-xs font-medium text-lum-ivory truncate">{selected.quantity}</p>
                    </div>
                  </div>
                )}
                {selected.location && selected.location !== '—' && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-lum-soft border border-lum-panel-border">
                    <MapPin className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Location</p>
                      <p className="text-xs font-medium text-lum-ivory truncate">{selected.location}</p>
                    </div>
                  </div>
                )}
                {selected.purchase_date && selected.purchase_date !== '—' && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-lum-soft border border-lum-panel-border">
                    <ShoppingCart className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Purchased</p>
                      <p className="text-xs font-medium text-lum-ivory truncate">{selected.purchase_date}</p>
                    </div>
                  </div>
                )}
                {selected.installation_date && selected.installation_date !== '—' && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-lum-soft border border-lum-panel-border">
                    <Package className="w-3.5 h-3.5 text-lum-slate-light flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Installed</p>
                      <p className="text-xs font-medium text-lum-ivory truncate">{selected.installation_date}</p>
                    </div>
                  </div>
                )}
                {selected.status && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-lum-soft border border-lum-panel-border col-span-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${selected.status === 'AVIABLE' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <div className="min-w-0">
                      <p className="text-[8px] tracking-[0.15em] uppercase text-lum-slate-warm/60">Status</p>
                      <p className="text-xs font-medium text-lum-ivory truncate">{selected.status}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

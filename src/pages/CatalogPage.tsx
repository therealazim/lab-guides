import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useI18n, type Lang } from '../i18n'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import { fetchEquipment as apiFetchEq } from '../api'

export default function CatalogPage() {
  const { lang } = useI18n()
  const navigate = useNavigate()
  const [adminItems, setAdminItems] = useState<any[]>([])
  const [staticOverrides, setStaticOverrides] = useState<Record<string, any>>({})
  const [mouse, setMouse] = useState({ x: 50, y: 50 })

  useEffect(() => {
    const initial = (window as any).__INITIAL_DATA__
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
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const allEquipments = useMemo(() => {
    const merged = staticEquipments.map((eq: any) =>
      staticOverrides[eq.slug] ? { ...eq, ...staticOverrides[eq.slug] } : eq
    )
    return [...merged, ...adminItems]
  }, [staticOverrides, adminItems])

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
            <Link to="/" className="flex items-center gap-1 text-lum-slate-warm hover:text-lum-ivory transition-colors text-xs tracking-[0.15em] uppercase">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
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
                {eq.quantity && eq.quantity !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">Qty: {eq.quantity}</p>}
                {eq.location && eq.location !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">{eq.location}</p>}
                {eq.purchase_date && eq.purchase_date !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">Purchased: {eq.purchase_date}</p>}
                {eq.installation_date && eq.installation_date !== '—' && <p className="text-[9px] text-lum-slate-warm/60 truncate">Installed: {eq.installation_date}</p>}
                {eq.status && (
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-medium ${
                    eq.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {eq.status}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

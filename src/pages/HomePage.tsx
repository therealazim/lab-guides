import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useI18n, type Lang } from '../i18n'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import { fetchEquipment as apiFetchEq, fetchHiddenEquipment } from '../api'

const SCROLL_KEY = 'homeScrollY'

const formatNewsDate = (value?: string) => {
  if (!value) return ''
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed)
}

export default function HomePage() {
  const { lang, t } = useI18n()
  const [query, setQuery] = useState('')
  const [mouse, setMouse] = useState({ x: 50, y: 50 })
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [spinKey, setSpinKey] = useState(0)
  const [adminItems, setAdminItems] = useState<any[]>([])
  const [staticOverrides, setStaticOverrides] = useState<Record<string, any>>({})
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>(() => {
    const initial = (window as any).__INITIAL_DATA__
    return Array.isArray(initial?.hiddenEquipment) ? initial.hiddenEquipment : []
  })
  const [adminPartners, setAdminPartners] = useState<{name:string;src:string;url:string}[]>([])
  const [newsItems, setNewsItems] = useState<any[]>([])
  const [newsIdx, setNewsIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [newsViewer, setNewsViewer] = useState<{ images: string[]; index: number; title: string } | null>(null)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const getNewsImages = (item: any): string[] => {
    const images = Array.isArray(item?.images) ? item.images.filter(Boolean) : []
    return images.length ? images : item?.image ? [item.image] : []
  }

  const openNewsViewer = (item: any, index = 0) => {
    const images = getNewsImages(item)
    if (!images.length) return
    setPlaying(false)
    setNewsViewer({ images, index: Math.max(0, Math.min(index, images.length - 1)), title: item?.title || 'News image' })
  }

  const closeNewsViewer = () => {
    setNewsViewer(null)
    setPlaying(true)
  }

  const moveNewsViewer = (direction: number) => {
    setNewsViewer(current => {
      if (!current || current.images.length < 2) return current
      return { ...current, index: (current.index + direction + current.images.length) % current.images.length }
    })
  }

  // Save scroll on unmount, restore on mount
  // Save scroll when navigating to equipment page, restore on back
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved) {
      const y = parseInt(saved, 10)
      if (!isNaN(y)) {
        setTimeout(() => window.scrollTo(0, y), 120)
      }
      sessionStorage.removeItem(SCROLL_KEY)
    }
  }, [])

  // Click handler to save scroll before navigation
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href^="#/equipment/"]')
      if (link) {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const allEquipments = useMemo(() => {
    const mergedStatic = staticEquipments
      .filter((eq: any) => !hiddenSlugs.includes(eq.slug))
      .map((eq: any) => staticOverrides[eq.slug] ? { ...eq, ...staticOverrides[eq.slug] } : eq)
    const visibleAdminItems = adminItems.filter((item: any) => !hiddenSlugs.includes(item.slug))
    return [...mergedStatic, ...visibleAdminItems]
  }, [staticOverrides, adminItems, hiddenSlugs])

  const filtered = useMemo(() => {
    if (!query.trim()) return allEquipments
    const q = query.toLowerCase()
    return allEquipments.filter((eq: any) => {
      const d = eq[lang as Lang] || eq.en || eq
      return (
        (d.name || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        eq.slug?.includes(q) ||
        (eq.en?.name || '').toLowerCase().includes(q)
      )
    })
  }, [query, lang, allEquipments])

  // Load admin data from API (always fetches fresh, uses injected data as initial)
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

  // Load partners from API
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
      setAdminPartners([...defaults, ...apiPartners])
    } else {
      setAdminPartners(defaults)
    }
    async function loadPartners() {
      try {
        const r = await fetch('/api/partners')
        const data = await r.json()
        if (data?.length) {
          const apiPartners = data.filter((p: any) => p.name && p.image).map((p: any) => ({ name: p.name, url: p.url, src: p.image }))
          setAdminPartners([...defaults, ...apiPartners])
        }
      } catch {}
    }
    loadPartners()
  }, [])

  // Load news
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

  // Close the viewer when the featured News slide changes.
  useEffect(() => { setNewsViewer(null) }, [newsIdx])

  // Keep the viewer focused and keyboard-navigable.
  useEffect(() => {
    if (!newsViewer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNewsViewer()
      if (e.key === 'ArrowLeft') moveNewsViewer(-1)
      if (e.key === 'ArrowRight') moveNewsViewer(1)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [newsViewer])

  useEffect(() => {
    if (newsItems.length <= 1 || !playing) return
    const timer = setInterval(() => {
      setNewsIdx(i => (i + 1) % newsItems.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [newsItems.length, playing])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Keyboard nav & close dropdown on outside click
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!showDropdown || !filtered.length) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIdx(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && highlightIdx >= 0) {
        e.preventDefault()
        navigate(`/catalog/${filtered[highlightIdx].slug}`)
        setShowDropdown(false)
        setQuery('')
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showDropdown, filtered, highlightIdx, navigate])

  useEffect(() => {
    if (!showDropdown) { setHighlightIdx(-1); return }
    const onOut = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [showDropdown])

  return (
    <div className="relative z-10">
      {/* Full-page grid spotlight */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          WebkitMaskImage: `radial-gradient(circle 400px at ${mouse.x}% ${mouse.y}%, rgba(0,0,0,0.8) 0%, transparent 60%)`,
          maskImage: `radial-gradient(circle 400px at ${mouse.x}% ${mouse.y}%, rgba(0,0,0,0.8) 0%, transparent 60%)`,
          WebkitMaskComposite: 'source-over',
          maskComposite: 'add',
        }}
      />

      {/* ─── FIXED NAV ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-lum-mid/80 backdrop-blur-xl border-b border-lum-panel-border">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/#/"><img src="/korea-univ-logo.svg" alt="Korea University" className="h-12 w-auto" /></a>
            <div>
              <p className="text-xs font-bold text-lum-ivory">고려대학교 IEH</p>
              <span className="text-lum-ivory font-bold text-xs tracking-[0.2em] uppercase">KMI - LUPIC</span>
              <p className="text-[8px] text-lum-slate-warm tracking-[0.15em] uppercase">{t('labGuide')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 pt-20 overflow-visible">

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="text-[clamp(2.8rem,6.5vw,5.5rem)] font-light tracking-[-0.05em] leading-[1] text-lum-ivory mb-24"
          >
            {t('title')}<br />
            <strong className="font-semibold bg-gradient-to-r from-lum-ivory via-lum-silver to-lum-slate-light bg-clip-text text-transparent">{t('heroTagline')}</strong>
          </motion.h1>

          {/* Search */}
          <div
            className="max-w-lg mx-auto w-full relative"
          >
            <div className="relative">
              <motion.div
                key={spinKey}
                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-5 top-1/2 -translate-y-1/2 z-10"
              >
                <Search className="w-5 h-5 text-lum-ivory/70" />
              </motion.div>
              <motion.input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setShowDropdown(true); setHighlightIdx(-1) }}
                onFocus={() => { setShowDropdown(true); setSpinKey(k => k + 1) }}
                placeholder={t('search')}
                animate={{
                  boxShadow: showDropdown
                    ? '0 0 20px rgba(156,163,175,0.15), 0 0 40px rgba(156,163,175,0.05)'
                    : '0 0 0px rgba(156,163,175,0)',
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full pl-12 pr-5 py-4 rounded-full bg-lum-panel-bg border border-lum-panel-border text-lum-ivory placeholder:text-lum-slate-warm/60 outline-none focus:border-lum-slate-light/20 transition-all text-sm backdrop-blur-xl"
              />
              {/* Dropdown */}
              {/* Lottie animation - always visible */}
              <div
                className="absolute -top-24 right-[-10px] pointer-events-none -z-10"
                style={{ transform: 'rotate(8deg)' }}
              >
                <dotlottie-wc
                  src="https://lottie.host/a44b6e06-10d9-46c4-8e7e-bded9c4d743d/z95IywomIe.lottie"
                  style={{ width: '100px', height: '100px' }}
                  autoplay
                  loop
                ></dotlottie-wc>
              </div>
              <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  ref={dropRef} className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-lum-mid border border-lum-panel-border backdrop-blur-xl overflow-y-auto shadow-2xl z-50 max-h-60"
                >
                  {filtered.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-lum-slate-warm/60 text-center">{t('noResults')}</div>
                  ) : (
                    filtered.map((eq: any, i: number) => {
                      const d = eq[lang as Lang] || eq.en || eq
                      return (
                        <Link
                          key={eq.slug}
                          to={`/catalog/${eq.slug}`}
                          onClick={() => { setShowDropdown(false); setQuery('') }}
                          className={`flex items-center gap-3 px-5 py-3 text-left text-sm transition-colors ${
                            i === highlightIdx ? 'bg-lum-soft text-lum-ivory' : 'text-lum-slate-light active:bg-lum-soft/50 md:hover:bg-lum-soft/50'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-lum-mid flex items-center justify-center overflow-hidden flex-shrink-0 border border-lum-panel-border">
                            {(eq.image || (imageMap as Record<string, string>)[eq.slug]) ? (
                              <img
                                src={eq.image || (imageMap as Record<string, string>)[eq.slug] || ''}
                                alt=""
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <span className="text-lg font-semibold text-lum-slate-warm/40">{d.name?.[0] || eq.slug?.[0] || '?'}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{d.name}</div>
                            <div className="text-xs text-lum-slate-warm/60 truncate">{d.description}</div>
                          </div>
                        </Link>
                      )
                    })
                  )}
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 1 }}
            className="flex justify-center gap-6 sm:gap-10 md:gap-14 mt-20"
          >
            {[
              { value: filtered.length, label: t('heroStatEquipment') },
              { value: '5', label: t('heroStatLanguages') },
              { value: '24/7', label: t('heroStatAccess') },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-[clamp(1.8rem,3vw,2.6rem)] font-light tracking-[-0.04em] text-lum-ivory">
                  {s.value}
                </div>
                <div className="text-[9px] font-medium tracking-[0.2em] uppercase text-lum-slate-warm mt-2">{s.label}</div>
              </div>
            ))}
          </motion.div>
      </section>

      {/* ─── NEWS SLIDER ─── */}
      {newsItems.length > 0 && (
        <section className="py-20 px-4 md:px-6 lg:px-8 border-t border-lum-panel-border">
          <h2 className="text-center text-[clamp(28px,3.5vw,40px)] font-light text-lum-ivory mb-12" style={{ fontFamily: "'Noto Serif KR', Georgia, serif" }}>
            KMI - LUPIC Today
          </h2>

          <div className="w-full">
            <div className="flex items-center gap-3 md:gap-4">
              {/* Prev button */}
              <button
                onClick={() => setNewsIdx(i => (i - 1 + newsItems.length) % newsItems.length)}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-lum-panel-border bg-lum-panel-bg flex items-center justify-center text-lum-slate-light hover:text-lum-ivory hover:border-lum-slate-light/30 transition-all flex-shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
              </button>

              <div className="flex-1 grid md:grid-cols-[1.4fr_1fr] gap-6 md:gap-10 items-center">
                {/* Featured News image */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={newsIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className="aspect-[4/3] md:aspect-[16/9] rounded-md overflow-hidden cursor-pointer group relative bg-lum-soft"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open photos for ${newsItems[newsIdx]?.title || 'this news post'}`}
                    onClick={() => openNewsViewer(newsItems[newsIdx])}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNewsViewer(newsItems[newsIdx]) } }}
                  >
                    {(() => {
                      const imgs = getNewsImages(newsItems[newsIdx])
                      if (imgs.length === 0) {
                        return <div className="w-full h-full flex items-center justify-center"><span className="text-lg text-lum-slate-warm/20">KMI</span></div>
                      }
                      return (
                        <>
                          <img src={imgs[0]} alt={`${newsItems[newsIdx]?.title || 'News'} cover`} className="w-full h-full object-cover bg-lum-soft transition-transform duration-700 group-hover:scale-[1.02]" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/10" />
                          <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 flex items-end justify-between gap-3">
                            <span className="inline-flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-md border border-white/15 px-3 py-2 text-xs text-white">
                              <Maximize2 className="w-3.5 h-3.5" /> View photo{imgs.length > 1 ? `s · ${imgs.length}` : ''}
                            </span>
                            {imgs.length > 1 && <span className="text-[10px] text-white/80">Click to open gallery</span>}
                          </div>
                        </>
                      )
                    })()}
                  </motion.div>
                </AnimatePresence>

                {/* Text panel */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={newsIdx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.45 }}
                    className="py-2"
                  >
                    <h3
                      className="text-[clamp(20px,2.2vw,28px)] font-medium text-lum-ivory leading-snug mb-4"
                      style={{ fontFamily: "'Noto Serif KR', Georgia, serif" }}
                    >
                      {newsItems[newsIdx].title}
                    </h3>
                    {newsItems[newsIdx].description && (
                      <p className="text-sm text-lum-slate-light/70 leading-relaxed line-clamp-3 mb-4">
                        {newsItems[newsIdx].description}
                      </p>
                    )}
                    {(newsItems[newsIdx].upload_date || newsItems[newsIdx].created_at) && (
                      <p className="text-[10px] uppercase tracking-[0.16em] text-lum-slate-warm/60 mb-6">
                        Uploaded {formatNewsDate(newsItems[newsIdx].upload_date || newsItems[newsIdx].created_at)}
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPlaying(!playing)}
                        className="w-8 h-8 rounded-full border border-lum-panel-border flex items-center justify-center text-lum-slate-light hover:text-lum-ivory transition-colors"
                        aria-label={playing ? 'Pause' : 'Play'}
                      >
                        {playing ? (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M7 5l12 7-12 7V5z" fill="currentColor"/></svg>
                        )}
                      </button>
                      <span className="text-xs text-lum-slate-warm/60">
                        <b className="text-lum-ivory font-semibold">{newsIdx + 1}</b> / {newsItems.length}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Next button */}
              <button
                onClick={() => setNewsIdx(i => (i + 1) % newsItems.length)}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-lum-panel-border bg-lum-panel-bg flex items-center justify-center text-lum-slate-light hover:text-lum-ivory hover:border-lum-slate-light/30 transition-all flex-shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* News image viewer */}
      <AnimatePresence>
        {newsViewer && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={`${newsViewer.title} image gallery`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeNewsViewer}
          >
            <motion.div
              className="relative w-full max-w-6xl max-h-[92vh] flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between gap-4 px-1">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">News gallery</p>
                  <h3 className="text-base md:text-lg text-white font-medium truncate mt-1">{newsViewer.title}</h3>
                </div>
                <button type="button" onClick={closeNewsViewer} aria-label="Close image gallery" className="w-10 h-10 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative w-full flex items-center justify-center min-h-0">
                {newsViewer.images.length > 1 && (
                  <button type="button" onClick={() => moveNewsViewer(-1)} aria-label="Previous image" className="absolute left-2 md:left-4 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/45 border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                )}
                <motion.img
                  key={newsViewer.images[newsViewer.index]}
                  src={newsViewer.images[newsViewer.index]}
                  alt={`${newsViewer.title}, image ${newsViewer.index + 1}`}
                  className="max-h-[68vh] md:max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                  initial={{ opacity: 0.4, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
                {newsViewer.images.length > 1 && (
                  <button type="button" onClick={() => moveNewsViewer(1)} aria-label="Next image" className="absolute right-2 md:right-4 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/45 border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 max-w-full">
                <span className="text-xs text-white/70 tabular-nums min-w-[3.5rem] text-center">{newsViewer.index + 1} / {newsViewer.images.length}</span>
                {newsViewer.images.length > 1 && (
                  <div className="flex items-center gap-2 max-w-[min(70vw,32rem)] overflow-x-auto py-1 px-1">
                    {newsViewer.images.map((image, index) => (
                      <button key={`${image}-${index}`} type="button" onClick={() => setNewsViewer(current => current ? { ...current, index } : current)} aria-label={`Open image ${index + 1}`} className={`w-14 h-10 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all ${newsViewer.index === index ? 'border-white' : 'border-white/15 opacity-55 hover:opacity-100'}`}>
                        <img src={image} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-white/40">Use the arrow keys to navigate · Press Esc to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── LOGO TICKER ─── */}
      <div className="py-16 px-8 md:px-12 lg:px-16 border-t border-b border-lum-panel-border overflow-hidden">
        <p className="text-center text-[9px] font-medium tracking-[0.25em] uppercase text-lum-slate-warm opacity-50 mb-8">
          Partners
        </p>
        <div className="flex w-max animate-[tickerScroll_30s_linear_infinite]" style={{ willChange: 'transform' }}>
          {[...Array(3)].flatMap(() => [
            ...adminPartners,
          ]).map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center mx-3 sm:mx-6 md:mx-8 lg:mx-12">
              <img
                src={item.src}
                alt="partner logo"
                className="h-24 sm:h-32 md:h-40 lg:h-56 w-auto object-contain opacity-60 hover:opacity-100 active:opacity-100 transition-opacity duration-500"
              />
              <span className="w-1 h-1 rounded-full bg-lum-slate-warm opacity-20 ml-3 sm:ml-6 md:ml-8 lg:ml-12" />
            </a>
          ))}
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="py-16 px-8 md:px-12 lg:px-16 border-t border-lum-panel-border">
        <div className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="flex items-center gap-3">
              <a href="/#/"><img src="/korea-univ-logo.svg" alt="Korea University" className="h-20 w-auto" /></a>
              <div>
                <p className="text-xs font-bold text-lum-slate-light/70">고려대학교 IEH</p>
                <span className="text-sm font-semibold tracking-[0.2em] uppercase text-lum-slate-light/70">KMI - LUPIC</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="/#/admin" className="inline-flex items-center gap-1.5 text-[9px] text-lum-slate-warm/30 hover:text-lum-slate-warm/60 transition-colors tracking-[0.15em] uppercase">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Admin
              </a>
              <Link to="/catalog" className="inline-flex items-center gap-1.5 text-[9px] text-lum-slate-warm/30 hover:text-lum-slate-warm/60 transition-colors tracking-[0.15em] uppercase">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Catalog
              </Link>
            </div>
          </div>
          <div className="text-center pt-8 border-t border-lum-panel-border">
            <p className="text-[10px] tracking-[0.15em] uppercase text-lum-slate-warm/80">
              &copy; 2026 <span className="text-lum-slate-light font-semibold">KMI / LUPIC Laboratory</span>
            </p>
            <p className="text-[11px] text-lum-slate-warm/50 mt-3 max-w-2xl mx-auto leading-relaxed">
              All information, media, and images on this site are credited to their respective owners. Use of materials is for educational purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
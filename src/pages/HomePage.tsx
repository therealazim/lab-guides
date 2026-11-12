import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, ClipboardList, Download, Award, MessageCircle, Megaphone, Search, ChevronLeft, ChevronRight, X, Menu } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n, type Lang } from '../i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import { fetchEquipment as apiFetchEq, fetchHiddenEquipment } from '../api'

const featuredSlugs = ['atomic-absorption-spectrometer', 'ion-chromatograph', 'uv-spectrometer', 'indoor-air-monitoring-system', 'outdoor-air-monitoring-system', 'microscope']
const resources = [
  { title: 'TRAINING', description: 'Step-by-step video lectures and learning materials', icon: BookOpen },
  { title: 'SOP', description: 'Standard Operating Procedures for each equipment', icon: ClipboardList },
  { title: 'DOWNLOAD', description: 'Manuals, worksheets, and reference materials', icon: Download },
  { title: 'CERTIFICATE', description: 'Get your training certificate after course completion', icon: Award },
  { title: 'FAQ', description: 'Find answers to frequently asked questions', icon: MessageCircle },
  { title: 'ANNOUNCEMENTS', description: 'Latest news and important updates', icon: Megaphone },
]
const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).format(date)
}

export default function HomePage() {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [equipment, setEquipment] = useState<any[]>(staticEquipments)
  const [news, setNews] = useState<any[]>([])
  const [gallery, setGallery] = useState<{ images: string[]; index: number; title: string } | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return equipment.filter((item: any) => {
      const localized = item[lang as Lang] || item.en || item
      return [localized.name, localized.description, item.slug, item.en?.name].some(value => String(value || '').toLowerCase().includes(term))
    }).slice(0, 8)
  }, [equipment, lang, query])

  useEffect(() => {
    document.title = t('title')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('subtitle'))
  }, [lang, t])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [apiItems, hidden] = await Promise.all([apiFetchEq(), fetchHiddenEquipment()])
        if (!active || !Array.isArray(apiItems) || !apiItems.length) return
        const hiddenSlugs = Array.isArray(hidden) ? hidden : []
        const bySlug = new Map(apiItems.map((item: any) => [item.slug, item]))
        setEquipment(staticEquipments.filter((item: any) => !hiddenSlugs.includes(item.slug)).map((item: any) => bySlug.has(item.slug) ? { ...item, ...(bySlug.get(item.slug) as object) } : item).concat(apiItems.filter((item: any) => item._overridden && !staticEquipments.some((base: any) => base.slug === item.slug) && !hiddenSlugs.includes(item.slug))))
      } catch { /* Bundled catalogue remains available offline. */ }
    }
    load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const initial = (window as any).__INITIAL_DATA__
    if (Array.isArray(initial?.news)) setNews(initial.news)
    fetch('/api/news').then(response => response.json()).then(data => { if (active && Array.isArray(data)) setNews(data) }).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!gallery) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGallery(null)
      if (event.key === 'ArrowLeft') setGallery(current => current ? { ...current, index: (current.index - 1 + current.images.length) % current.images.length } : current)
      if (event.key === 'ArrowRight') setGallery(current => current ? { ...current, index: (current.index + 1) % current.images.length } : current)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [gallery])

  const featured = featuredSlugs.map(slug => equipment.find((item: any) => item.slug === slug)).filter(Boolean)
  const imagesFor = (item: any): string[] => Array.isArray(item?.images) ? item.images.filter(Boolean) : item?.image ? [item.image] : []
  const openGallery = (item: any) => { const images = imagesFor(item); if (images.length) setGallery({ images, index: 0, title: item.title || t('newsImage') }) }

  return <div className="lupic-home min-h-screen bg-white text-slate-800">
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-5 py-3 lg:px-10">
        <a href="/#/" aria-label="LUPIC home" className="flex h-14 w-28 shrink-0 items-center justify-center rounded-[45%] bg-gradient-to-br from-rose-100 via-white to-indigo-100 text-2xl font-black tracking-tight text-slate-900">LUPIC</a>
        <nav className="hidden items-center gap-7 lg:flex">
          <a className="lupic-nav-active" href="#home">HOME</a><a className="lupic-nav" href="#equipment">EQUIPMENT</a><a className="lupic-nav" href="#resources">TRAINING</a><a className="lupic-nav" href="#resources">SOP</a><a className="lupic-nav" href="#resources">DOWNLOAD</a><a className="lupic-nav" href="#about">ABOUT</a>
        </nav>
        <div className="flex items-center gap-3"><div className="hidden h-9 items-center gap-3 md:flex"><img src="/logos/moe.svg" alt="Ministry of Education" className="h-7 max-w-[100px] object-contain" /><img src="/logos/nrf.svg" alt="National Research Foundation of Korea" className="h-8 max-w-[115px] object-contain" /></div><LanguageSwitcher /><button type="button" onClick={() => setMobileMenu(value => !value)} className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden" aria-label="Toggle navigation"><Menu size={20} /></button></div>
      </div>
      {mobileMenu && <nav className="grid gap-1 border-t border-slate-100 bg-white px-6 py-4 lg:hidden">{[['HOME','#home'],['EQUIPMENT','#equipment'],['TRAINING','#resources'],['SOP','#resources'],['DOWNLOAD','#resources'],['ABOUT','#about']].map(([label,href]) => <a key={label} href={href} onClick={() => setMobileMenu(false)} className="py-2 text-sm font-semibold text-slate-700">{label}</a>)}</nav>}
    </header>

    <main>
      <section id="home" className="lupic-hero relative isolate overflow-visible">
        <div className="absolute inset-0 -z-20 bg-[url('/images/eb8e30205e7bc.webp')] bg-cover bg-center" /><div className="absolute inset-0 -z-10 bg-gradient-to-r from-rose-50/95 via-white/90 to-white/35" />
        <div className="mx-auto grid min-h-[420px] max-w-[1440px] items-center gap-8 px-6 py-14 md:min-h-[470px] md:grid-cols-[1.08fr_.92fr] md:px-16 lg:py-20">
          <div className="max-w-2xl"><p className="mb-2 text-lg font-medium text-[#17345f] md:text-2xl">KU Environmental Health</p><h1 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-[#102b50] md:text-5xl">Laboratory Training Platform</h1><div className="my-6 h-[3px] w-12 rounded-full bg-[#e98b83]" /><p className="max-w-lg text-sm leading-7 text-slate-700 md:text-base">Building capacity for environmental health through equipment training and knowledge sharing</p>
            <div className="mt-7 flex flex-wrap items-center gap-5"><img src="/logos/korea-univ.svg" alt="Korea University" className="h-9 max-w-[150px] object-contain" /><span className="hidden h-8 w-px bg-slate-300 sm:block" /><span className="text-sm font-bold text-[#18345c]">TMA <span className="block text-[10px] font-medium text-slate-600">Medical Academy</span></span><span className="hidden h-8 w-px bg-slate-300 sm:block" /><img src="/logos/kmi.svg" alt="Korea Medical Institute" className="h-10 max-w-[145px] object-contain" /></div>
            <div className="relative mt-8 max-w-md"><div className="flex overflow-hidden rounded-full border border-white/80 bg-white shadow-md"><Search className="ml-4 mt-3.5 shrink-0 text-slate-400" size={18} /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} onFocus={() => setShowDropdown(true)} onKeyDown={event => { if (event.key === 'Enter' && filtered[0]) { navigate(`/catalog/${filtered[0].slug}`); setShowDropdown(false) } }} placeholder={t('search')} className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400" /><Link to="/catalog" className="m-1 rounded-full bg-[#102d55] px-4 py-2 text-xs font-bold text-white">GET STARTED <ArrowRight className="ml-1 inline" size={14} /></Link></div>
              {showDropdown && query.trim() && <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{filtered.length ? filtered.map((item: any) => { const localized = item[lang as Lang] || item.en || item; return <Link key={item.slug} to={`/catalog/${item.slug}`} onClick={() => { setShowDropdown(false); setQuery('') }} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50"><img src={item.image || (imageMap as Record<string,string>)[item.slug] || ''} alt="" className="h-10 w-12 object-contain" /><span><strong className="block text-sm text-slate-800">{localized.name}</strong><small className="text-xs text-slate-500">{localized.description}</small></span></Link> }) : <p className="p-3 text-sm text-slate-500">{t('noResults')}</p>}</div>}
            </div>
          </div><div className="hidden md:block" aria-hidden="true" />
        </div>
      </section>

      <section id="equipment" className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-10">
        <div className="mb-6 flex items-end justify-between gap-4"><div><h2 className="text-center text-2xl font-bold tracking-tight text-[#17345f] md:text-left">EQUIPMENT</h2><div className="mx-auto mt-2 h-[3px] w-10 bg-[#e98b83] md:mx-0" /></div><Link to="/catalog" className="text-xs font-bold uppercase tracking-wide text-[#e17f78] hover:text-[#b95d58]">View all <ArrowRight className="ml-1 inline" size={14} /></Link></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{featured.map((item: any) => { const localized = item[lang as Lang] || item.en || item; const image = item.image || (imageMap as Record<string,string>)[item.slug]; return <Link key={item.slug} to={`/catalog/${item.slug}`} className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-24 items-center justify-center sm:h-28"><img src={image} alt={localized.name} className="max-h-full max-w-full object-contain transition group-hover:scale-105" /></div><h3 className="mt-3 text-sm font-bold text-slate-800">{localized.name}</h3><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{localized.description}</p><div className="mt-2 flex justify-end text-[#e58b83]"><ArrowRight size={15} /></div></Link> })}</div>
      </section>

      <section id="resources" className="mx-auto max-w-[1440px] px-5 pb-8 md:px-10"><div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-200 sm:grid-cols-3 lg:grid-cols-6">{resources.map(({title,description,icon:Icon}) => <Link key={title} to="/catalog" className="group flex min-h-[190px] flex-col items-center bg-[#f7f8fc] px-4 py-6 text-center transition hover:bg-white"><Icon size={38} strokeWidth={1.5} className="mb-4 text-[#18345c] transition group-hover:-translate-y-1" /><h3 className="text-xs font-bold text-[#17345f]">{title}</h3><p className="mt-2 max-w-[180px] text-[11px] leading-4 text-slate-600">{description}</p><span className="mt-auto pt-4 text-[10px] font-bold tracking-wide text-[#e18b83]">LEARN MORE <ArrowRight className="ml-1 inline" size={12} /></span></Link>)}</div></section>

      <section id="about" className="mx-auto grid max-w-[1440px] gap-10 px-5 py-10 md:grid-cols-[1.15fr_.85fr] md:px-10 md:py-14">
        <div><h2 className="text-xl font-bold text-[#17345f]">WELCOME TO OUR PLATFORM</h2><div className="mb-5 mt-2 h-[3px] w-10 bg-[#e98b83]" /><p className="max-w-xl text-sm leading-7 text-slate-600">This platform is part of the LUPIC project between Korea University, Tashkent Medical Academy (TMA), and Korea Medical Institute (KMI) to strengthen environmental health education and research capacity in Uzbekistan.</p><Link to="/catalog" className="mt-6 inline-flex items-center gap-2 rounded border border-[#e18b83] px-4 py-2 text-xs font-bold text-[#d87870] transition hover:bg-rose-50">ABOUT LUPIC <ArrowRight size={14} /></Link></div>
        <div><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-bold text-[#17345f]">LATEST NEWS</h2><div className="mt-2 h-[3px] w-10 bg-[#e98b83]" /></div></div>{news.length ? <div className="space-y-3">{news.slice(0,3).map((item:any,index:number) => <article key={item.id || item.title || index} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0"><div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded bg-[#f2f4f8] text-center text-[9px] font-semibold uppercase text-slate-500"><span>{formatDate(item.date || item.createdAt).split(' ')[0]}</span><strong className="text-lg leading-5 text-[#17345f]">{formatDate(item.date || item.createdAt).split(' ')[1]?.replace(',','')}</strong><span>{formatDate(item.date || item.createdAt).split(' ')[2]}</span></div><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-slate-800">{item.title}</h3><p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.description || item.content || 'Korea University LUPIC project update'}</p>{imagesFor(item).length > 0 && <button onClick={() => openGallery(item)} className="mt-1 text-xs font-semibold text-[#df8179]">Read more <ArrowRight className="ml-1 inline" size={12} /></button>}</div></article>)}</div> : <p className="text-sm leading-6 text-slate-500">{t('newsUpdatesSoonDesc')}</p>}</div>
      </section>
    </main>

    <footer className="bg-[#102d55] px-5 py-8 text-white md:px-10"><div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-[1fr_1.2fr_.8fr]"><div><div className="text-3xl font-black tracking-tight">LUPIC</div><p className="mt-1 max-w-[190px] text-xs leading-5 text-blue-100">Leading University Project for International Cooperation</p></div><div><h3 className="mb-3 text-xs font-bold uppercase tracking-wider">CONTACT US</h3><a className="block text-xs leading-6 text-blue-100 hover:text-white" href="mailto:ku.tma.lupic@gmail.com">✉ ku.tma.lupic@gmail.com</a><a className="block text-xs leading-6 text-blue-100 hover:text-white" href="https://ku-tma.com" target="_blank" rel="noreferrer">◎ https://ku-tma.com</a><p className="text-xs leading-6 text-blue-100">⌖ Korea University, Seoul, Republic of Korea</p></div><div><h3 className="mb-3 text-xs font-bold uppercase tracking-wider">FOLLOW US</h3><a href="mailto:ku.tma.lupic@gmail.com" aria-label="Email LUPIC" className="inline-flex rounded-full bg-white/15 p-2 hover:bg-white/25"><MessageCircle size={16} /></a><div className="mt-5 flex gap-3"><Link to="/admin" className="text-xs text-blue-100 hover:text-white">{t('adminLink')}</Link><Link to="/catalog" className="text-xs text-blue-100 hover:text-white">{t('catalogLink')}</Link></div></div></div><div className="mx-auto mt-7 flex max-w-[1440px] flex-col justify-between gap-2 border-t border-white/15 pt-4 text-[10px] text-blue-100/75 sm:flex-row"><span>© 2025 Korea University. All Rights Reserved.</span><span>Privacy Policy　 |　 Terms of Use</span></div></footer>

    {gallery && <div role="dialog" aria-modal="true" aria-label={gallery.title} onClick={() => setGallery(null)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"><div className="relative flex max-h-[90vh] w-full max-w-5xl items-center justify-center" onClick={event => event.stopPropagation()}><button onClick={() => setGallery(null)} aria-label="Close gallery" className="absolute -top-12 right-0 rounded-full bg-white/15 p-2 text-white"><X size={20} /></button>{gallery.images.length > 1 && <button onClick={() => setGallery(current => current ? {...current,index:(current.index-1+current.images.length)%current.images.length} : current)} aria-label="Previous image" className="absolute left-2 z-10 rounded-full bg-black/50 p-3 text-white"><ChevronLeft /></button>}<img src={gallery.images[gallery.index]} alt={gallery.title} className="max-h-[82vh] max-w-full rounded-lg object-contain" />{gallery.images.length > 1 && <button onClick={() => setGallery(current => current ? {...current,index:(current.index+1)%current.images.length} : current)} aria-label="Next image" className="absolute right-2 z-10 rounded-full bg-black/50 p-3 text-white"><ChevronRight /></button>}</div></div>}
  </div>
}

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Upload, LogOut, Eye, EyeOff, Trash2, Menu, X, List, Link2, Image as ImageIcon, Languages, Newspaper, LayoutDashboard, ChevronRight, Plus, Settings2, Pencil } from 'lucide-react'
import * as XLSX from 'xlsx'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import { useI18n, UI_STRINGS } from '../i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'
import ThemeToggle from '../components/ThemeToggle'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import { fetchEquipment as apiFetchEquipment, fetchHiddenEquipment, deleteEquipmentApi, savePartner as apiSavePartner, updatePartner as apiUpdatePartner, deletePartnerApi } from '../api'

const ADMIN_LOGIN = 'admin'
const ADMIN_PASSWORD = 'admin123'

interface EquipmentForm {
  name: string
  brand: string
  model: string
  location: string
  quantity: string
  purchase_date: string
  installation_date: string
  status: string
}

const emptyForm: EquipmentForm = {
  name: '', brand: '', model: '', location: '', quantity: '',
  purchase_date: '', installation_date: '', status: 'AVAILABLE',
}

const DEFAULT_PARTNERS = [
  { name: 'KMI', url: 'https://kkmi.uz/en/', src: '/logos/kmi.svg', _default: true },
  { name: 'Korea University', url: 'https://hes.korea.ac.kr/eng/main/main.html#HOME', src: '/logos/korea-univ.svg', _default: true },
  { name: 'Ministry of Education', url: 'https://www.moe.go.kr/main.do?s=moe', src: '/logos/moe.svg', _default: true },
  { name: 'NRF', url: 'https://www.nrf.re.kr/index', src: '/logos/nrf.svg', _default: true },
]

const todayDate = () => new Date().toISOString().slice(0, 10)
const formatNewsDate = (value?: string) => {
  if (!value) return ''
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed)
}

export default function AdminPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [authed, setAuthed] = useState(() => localStorage.getItem('admin_auth') === 'true')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState<EquipmentForm>(emptyForm)
  const [image, setImage] = useState<string | null>(null)
  const [savedItems, setSavedItems] = useState<any[]>([])
  const [editIdx, setEditIdx] = useState<string | null>(null)
  const [editIsStatic, setEditIsStatic] = useState(false)
  const [showEquipList, setShowEquipList] = useState(false)
  const [showPartners, setShowPartners] = useState(false)
  const [showTranslations, setShowTranslations] = useState(false)
  const [showNews, setShowNews] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [partners, setPartners] = useState<{name: string; src: string; url: string; _default?: boolean; _id?: number}[]>(DEFAULT_PARTNERS)
  const [partnerName, setPartnerName] = useState('')
  const [partnerUrl, setPartnerUrl] = useState('')
  const [partnerImg, setPartnerImg] = useState<string | null>(null)
  const [partnerEditIdx, setPartnerEditIdx] = useState<number | null>(null)
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({})
  const [transKeys, setTransKeys] = useState<string[]>([])

  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [confirmMsg, setConfirmMsg] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [mouse, setMouse] = useState({ x: 50, y: 50 })
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [loginError, setLoginError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  const [overrides, setOverrides] = useState<Record<string, any>>({})
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>(() => {
    const initial = (window as any).__INITIAL_DATA__
    return Array.isArray(initial?.hiddenEquipment) ? initial.hiddenEquipment : []
  })
  const [manual, setManual] = useState<string | null>(null)
  const manualRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)

  // News state
  const [newsItems, setNewsItems] = useState<any[]>([])
  const [newsTitle, setNewsTitle] = useState('')
  const [newsDesc, setNewsDesc] = useState('')
  const [newsDate, setNewsDate] = useState(todayDate)
  const [newsImgs, setNewsImgs] = useState<string[]>([])
  const [newsEditIdx, setNewsEditIdx] = useState<number | null>(null)
  const newsImgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiFetchEquipment().then(data => {
      if (data && data.length) {
        const admin = data.filter((d: any) => d._overridden && !staticEquipments.some((s: any) => s.slug === d.slug))
        const ovs: Record<string, any> = {}
        data.filter((d: any) => staticEquipments.some((s: any) => s.slug === d.slug)).forEach((d: any) => { ovs[d.slug] = d })
        setSavedItems(admin)
        setOverrides(ovs)
      }
    }).catch(() => {})
    fetch('/api/partners').then(r => r.json()).then(data => {
      if (data && data.length) {
        const apiPartners = data.filter((p: any) => p.name && p.image).map((p: any) => ({ name: p.name, src: p.image, url: p.url, _id: p.id, _default: false }))
        setPartners([...DEFAULT_PARTNERS, ...apiPartners])
      }
    }).catch(() => {})
    const initial = (window as any).__INITIAL_DATA__
    if (Array.isArray(initial?.hiddenEquipment)) setHiddenSlugs(initial.hiddenEquipment)
    fetchHiddenEquipment().then(data => {
      if (Array.isArray(data)) setHiddenSlugs(data)
    }).catch(() => {})
  }, [])

  const loadNews = async () => {
    try {
      const r = await fetch('/api/news')
      const data = await r.json()
      if (data) setNewsItems(data)
    } catch {}
  }

  const loadTranslations = async () => {
    try {
      const r = await fetch('/api/translations')
      const data = await r.json()
      setTranslations(data)
      const allKeys = new Set<string>()
      Object.keys(data).forEach(k => allKeys.add(k))
      Object.keys(UI_STRINGS.en).forEach(k => allKeys.add(k))
      setTransKeys(Array.from(allKeys).sort())
    } catch {}
  }

  type AdminSection = 'home' | 'equipment' | 'partners' | 'translations' | 'news'
  const activeSection: AdminSection = editIdx !== null || showEquipList ? 'equipment' : showPartners ? 'partners' : showTranslations ? 'translations' : showNews ? 'news' : 'home'

  const openSection = (section: AdminSection) => {
    setShowEquipList(section === 'equipment')
    setShowPartners(section === 'partners')
    setShowTranslations(section === 'translations')
    setShowNews(section === 'news')
    setEditIdx(null)
    setEditIsStatic(false)
    resetForm()
    if (section === 'translations') loadTranslations()
    if (section === 'news') loadNews()
    setMenuOpen(false)
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const save = async (items: any[]) => {
    setSavedItems(items)
    for (const item of items) {
      try {
        await fetch('/api/equipment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
      } catch (e) {
        console.error('DB save failed', e)
      }
    }
  }

  const saveOverrides = async (ov: Record<string, any>) => {
    setOverrides({...ov})
    for (const [slug, data] of Object.entries(ov)) {
      try {
        await fetch('/api/equipment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, ...data as any }) })
      } catch (e) {
        console.error('DB override save failed', e)
      }
    }
  }

  const overriddenStatic = staticEquipments.map(eq => {
    const ov = overrides[eq.slug]
    return ov ? { ...eq, ...ov, _overridden: true } : eq
  })

  const login = () => {
    if (username === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
      setLoginSuccess(true)
      setTimeout(() => { setAuthed(true); localStorage.setItem('admin_auth', 'true'); setLoginSuccess(false) }, 2500)
      setUsername(''); setPassword('')
    } else {
      setLoginError(true)
      setTimeout(() => setLoginError(false), 2500)
    }
  }

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleManual = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setManual(reader.result as string)
    reader.readAsDataURL(file)
  }

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const resetForm = () => { setForm(emptyForm); setImage(null); setManual(null); setEditIdx(null) }

  const editItem = (item: any) => {
    setForm({
      name: item.en?.name || '',
      brand: item.brand || '',
      model: item.model || '',
      location: item.location || '',
      quantity: item.quantity || '',
      purchase_date: item.purchase_date || '',
      installation_date: item.installation_date || '',
      status: item.status || 'AVAILABLE',
    })
    setImage(item.image || null)
    setManual(item.manual || null)
    setEditIdx(item.slug)
    setEditIsStatic(staticEquipments.some(e => e.slug === item.slug))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    setSaving(true)
    setSaveProgress(10)

    const slug = generateSlug(form.brand + '-' + form.model)
    const data: any = {
      slug,
      en: { name: form.name || form.brand + ' ' + form.model },
      brand: form.brand || '—',
      model: form.model || '—',
      location: form.location || '—',
      quantity: form.quantity || '1',
      purchase_date: form.purchase_date || '—',
      installation_date: form.installation_date || '—',
      status: form.status || 'AVAILABLE',
      image: image,
      manual: manual,
    }

    setSaveProgress(30)
    try {
      if (editIdx !== null) {
        if (editIsStatic) {
          const ov = { ...overrides }
          ov[editIdx] = data
          await saveOverrides(ov)
        } else {
          const updated = [...savedItems]
          const idx = savedItems.findIndex((it: any) => it.slug === editIdx)
          if (idx >= 0) { updated[idx] = data; await save(updated) }
          else { await save([...savedItems, data]) }
        }
      } else {
        await save([...savedItems, data])
      }
      setSaveProgress(100)
      setToastMsg('Changes applied successfully!'); setToastShow(true)
      setTimeout(() => { setSaving(false); setSaveProgress(0); resetForm() }, 1500)
    } catch (e: any) {
      setSaving(false)
      setSaveProgress(0)
      setToastMsg('Error: ' + (e?.message || 'Save failed')); setToastShow(true)
    }
  }

  // Login screen
  if (!authed) {
    if (loginSuccess) {
      return (
        <div className="min-h-screen bg-lum-deep flex items-center justify-center p-4">
          <dotlottie-wc
            src="https://lottie.host/d37c46cb-82e4-485e-b564-ddeea9a4b07f/94KZRUR1Vs.lottie"
            style={{ width: '300px', height: '300px' }}
            autoplay
          ></dotlottie-wc>
        </div>
      )
    }
    if (loginError) {
      return (
        <div className="min-h-screen bg-lum-deep flex items-center justify-center p-4">
          <dotlottie-wc
            src="https://lottie.host/a4d516a2-3683-4702-bec4-f5ff25c70dc2/KxnaCqRQk2.lottie"
            style={{ width: '300px', height: '300px' }}
            autoplay
          ></dotlottie-wc>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-lum-deep flex items-center justify-center p-4">
        <div className="lum-card p-8 max-w-sm w-full text-center">
          <img src="/korea-univ-logo.svg" alt="Korea University" className="h-16 sm:h-24 mx-auto mb-6" />
          <h1 className="text-lg font-bold text-lum-ivory mb-2">{t('adminPanel')}</h1>
          <p className="text-[10px] text-lum-slate-warm mb-6 tracking-[0.15em] uppercase">KMI - LUPIC Laboratory</p>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            placeholder={t('adminUsername')}
            onKeyDown={e => { if (e.key === 'Enter') pwRef.current?.focus() }}
            className="w-full px-4 py-3 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory placeholder:text-lum-slate-warm/60 outline-none focus:border-lum-slate-light/20 text-sm mb-3" />
          <div className="relative mb-4">
            <input ref={pwRef} type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder={t('adminPassword')}
              className="w-full px-4 py-3 pr-10 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory placeholder:text-lum-slate-warm/60 outline-none focus:border-lum-slate-light/20 text-sm" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-lum-slate-warm hover:text-lum-ivory transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={login} className="btn-lum-primary w-full justify-center">{t('adminLoginBtn')}</button>
        </div>
      </div>
    )
  }

  const saveNews = async () => {
    if (!newsTitle.trim()) { alert('Title is required'); return }
    const body: any = { title: newsTitle, description: newsDesc, upload_date: newsDate || todayDate(), images: newsImgs, id: newsEditIdx ?? undefined }
    try {
      const r = await fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (d.ok) {
        setToastMsg('News saved!'); setToastShow(true)
        setNewsTitle(''); setNewsDesc(''); setNewsDate(todayDate()); setNewsImgs([]); setNewsEditIdx(null)
        loadNews()
      }
    } catch (e: any) {
      setToastMsg('Error: ' + (e?.message || 'Save failed')); setToastShow(true)
    }
  }

  const deleteNewsItem = async (id: number) => {
    try {
      await fetch('/api/news/' + id, { method: 'DELETE' })
      setToastMsg('News deleted'); setToastShow(true)
      loadNews()
    } catch {}
  }

  const sectionItems = [
    { id: 'home' as AdminSection, label: 'Dashboard', description: 'Overview and shortcuts', icon: LayoutDashboard },
    { id: 'equipment' as AdminSection, label: 'Equipment', description: 'Add, edit, or hide guides', icon: List },
    { id: 'partners' as AdminSection, label: 'Partners', description: 'Manage logos and links', icon: Link2 },
    { id: 'translations' as AdminSection, label: 'Translations', description: 'Import or export language text', icon: Languages },
    { id: 'news' as AdminSection, label: 'News', description: 'Publish homepage updates', icon: Newspaper },
  ]
  const activeSectionMeta = sectionItems.find(item => item.id === activeSection) || sectionItems[0]

  const editNewsItem = (item: any) => {
    setNewsTitle(item.title || '')
    setNewsDesc(item.description || '')
    setNewsDate(item.upload_date || (item.created_at ? item.created_at.slice(0, 10) : todayDate()))
    setNewsImgs(item.images || (item.image ? [item.image] : []))
    setNewsEditIdx(item.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetNewsForm = () => { setNewsTitle(''); setNewsDesc(''); setNewsDate(todayDate()); setNewsImgs([]); setNewsEditIdx(null) }

  return (
    <div className="min-h-screen bg-lum-deep">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-lum-mid/80 backdrop-blur-xl border-b border-lum-panel-border">
        <div className="w-full px-2 sm:px-4 py-2.5 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 sm:gap-3">
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close admin menu' : 'Open admin menu'} title={menuOpen ? 'Close admin menu' : 'Open admin menu'} className="p-2 rounded-lg bg-lum-panel-bg border border-lum-panel-border text-lum-slate-warm hover:text-lum-ivory transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <button type="button" onClick={() => openSection('home')} aria-label="Go to admin dashboard" className="flex-shrink-0">
              <img src="/korea-univ-logo.svg" alt="Korea University" className="h-8 sm:h-12 w-auto" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold text-lum-ivory truncate">Admin workspace</p>
              <p className="text-[10px] text-lum-slate-warm tracking-[0.12em] uppercase truncate">{activeSectionMeta.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <button onClick={() => navigate('/')} className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-full bg-lum-panel-bg border border-lum-panel-border text-lum-slate-warm hover:text-lum-ivory transition-colors text-[10px]">
              <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t('adminBack')}</span>
            </button>
            <button onClick={() => { setAuthed(false); localStorage.removeItem('admin_auth') }} className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-full bg-lum-panel-bg border border-lum-panel-border text-lum-slate-warm hover:text-lum-ivory transition-colors text-[10px]">
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t('adminLogout')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Side panel */}
      <AnimatePresence>
        {menuOpen && (
          <motion.button
            type="button"
            aria-label="Close admin menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
      <motion.aside
        initial={false}
        animate={{ x: menuOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Admin navigation"
        className="fixed top-0 left-0 bottom-0 z-50 w-[min(20rem,88vw)] bg-lum-mid border-r border-lum-panel-border pt-20 px-4 overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5 px-1">
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase text-lum-slate-warm/60">Workspace</p>
            <p className="text-sm font-semibold text-lum-ivory">Admin tools</p>
          </div>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close admin menu" className="p-2 rounded-lg text-lum-slate-warm hover:text-lum-ivory hover:bg-lum-panel-bg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="space-y-1.5">
          {sectionItems.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => openSection(id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors ${activeSection === id ? 'bg-lum-slate-light/10 border-lum-slate-light/30 text-lum-ivory' : 'bg-transparent border-transparent text-lum-slate-warm hover:bg-lum-panel-bg hover:text-lum-ivory'}`}
            >
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${activeSection === id ? 'bg-lum-slate-light/15 text-lum-slate-light' : 'bg-lum-panel-bg text-lum-slate-warm'}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-[10px] text-current/50 truncate mt-0.5">{description}</span>
              </span>
              {activeSection === id && <ChevronRight className="w-3.5 h-3.5 text-lum-slate-light" />}
            </button>
          ))}
        </nav>
        <div className="mt-8 p-3.5 rounded-xl bg-lum-panel-bg border border-lum-panel-border">
          <div className="flex items-center gap-2 text-lum-slate-light mb-2">
            <Settings2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Quick guide</span>
          </div>
          <p className="text-[10px] leading-relaxed text-lum-slate-warm/70">Start with Equipment to update guides. Use News for homepage updates, Partners for logos, and Translations for language text.</p>
        </div>
      </motion.aside>

      <main className="max-w-6xl mx-auto px-4 py-6 relative">
        {/* Dashboard */}
        {activeSection === 'home' && (
          <>
            <div
              className="fixed inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
                backgroundSize: '120px 120px',
                WebkitMaskImage: `radial-gradient(circle 400px at ${mouse.x}% ${mouse.y}%, rgba(0,0,0,0.8) 0%, transparent 60%)`,
                maskImage: `radial-gradient(circle 400px at ${mouse.x}% ${mouse.y}%, rgba(0,0,0,0.8) 0%, transparent 60%)`,
                WebkitMaskComposite: 'source-over',
                maskComposite: 'add',
              }}
            />
            <div className="relative py-8 md:py-12">
              <div className="max-w-3xl mb-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-lum-slate-light mb-3">Control center</p>
                <h1 className="text-3xl md:text-4xl font-light tracking-[-0.04em] text-lum-ivory mb-3">What would you like to update?</h1>
                <p className="text-sm leading-relaxed text-lum-slate-warm/80">Choose a workspace below. Each area handles one kind of content, so you can make changes without searching through a crowded screen.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                  { label: 'Visible equipment', value: staticEquipments.length + savedItems.length - hiddenSlugs.length },
                  { label: 'Partners', value: partners.length },
                  { label: 'News posts', value: newsItems.length },
                  { label: 'Translation keys', value: transKeys.length || Object.keys(UI_STRINGS.en).length },
                ].map(stat => (
                  <div key={stat.label} className="lum-card p-4">
                    <p className="text-2xl font-light text-lum-ivory">{stat.value}</p>
                    <p className="text-[10px] text-lum-slate-warm/70 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionItems.slice(1).map(({ id, label, description, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => openSection(id)} className="lum-card p-5 flex items-center gap-4 text-left hover:border-lum-slate-light/30 hover:bg-lum-panel-bg/60 transition-all group">
                    <span className="w-11 h-11 rounded-xl bg-lum-slate-light/10 text-lum-slate-light flex items-center justify-center flex-shrink-0 group-hover:bg-lum-slate-light/20 transition-colors"><Icon className="w-5 h-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-medium text-lum-ivory">{label}</span>
                      <span className="block text-xs text-lum-slate-warm/70 mt-1">{description}</span>
                    </span>
                    <Plus className="w-4 h-4 text-lum-slate-warm/60 group-hover:text-lum-slate-light transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {activeSection !== 'home' && (
          <div className="flex items-start justify-between gap-4 mb-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-lum-slate-light mb-2">{editIdx !== null ? 'Editing equipment' : activeSectionMeta.label}</p>
              <h1 className="text-2xl md:text-3xl font-light tracking-[-0.04em] text-lum-ivory">{editIdx !== null ? t('adminEdit') : activeSectionMeta.label}</h1>
              <p className="text-xs leading-relaxed text-lum-slate-warm/70 mt-2 max-w-2xl">{editIdx !== null ? 'Update the guide details below, then save your changes.' : activeSectionMeta.description}</p>
            </div>
            <button type="button" onClick={() => openSection('home')} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full border border-lum-panel-border text-[10px] text-lum-slate-warm hover:text-lum-ivory hover:border-lum-slate-light/30 transition-colors flex-shrink-0">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </button>
          </div>
        )}

        {/* Add form + Equipment list (combined) */}
        {showEquipList && !editIdx && (
          <>
            {/* Inline add form */}
            <div className="lum-card p-4 md:p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="w-9 h-9 rounded-lg bg-lum-slate-light/10 text-lum-slate-light flex items-center justify-center flex-shrink-0"><Plus className="w-4 h-4" /></span>
                <div>
                  <p className="text-sm font-medium text-lum-ivory">{t('adminAddNew')}</p>
                  <p className="text-[10px] text-lum-slate-warm/70 mt-1">Start with the name, brand, and model. You can add more details after opening the guide.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {[
                  { key: 'name', label: t('adminName') },
                  { key: 'brand', label: t('adminBrand') },
                  { key: 'model', label: t('adminModel') },
                ].map(field => (
                  <label key={field.key} className="block">
                    <span className="block text-[10px] font-medium text-lum-slate-warm/80 mb-1.5">{field.label}</span>
                    <input value={(form as any)[field.key]} onChange={e => setForm({...form, [field.key]: e.target.value})} placeholder={`Enter ${field.label.toLowerCase()}`} className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory placeholder:text-lum-slate-warm/40 text-sm outline-none focus:border-lum-slate-light/20" />
                  </label>
                ))}
              </div>
              <button onClick={handleSubmit} className="btn-lum-primary flex items-center gap-2 text-xs px-5 py-3">
                <Save className="w-3.5 h-3.5" /> Add equipment
              </button>
            </div>

            {/* Equipment grid */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-medium text-lum-ivory">Saved equipment</p>
                <p className="text-[10px] text-lum-slate-warm/60 mt-1">Select a card to edit its guide. Use the trash icon to hide it from the public catalog.</p>
              </div>
              <span className="text-[10px] text-lum-slate-warm/60">{staticEquipments.length + savedItems.length - hiddenSlugs.length} visible</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {[...overriddenStatic, ...savedItems].filter((item: any) => !hiddenSlugs.includes(item.slug)).map((item: any) => (
              <div key={item.slug} className="lum-card p-4 flex items-center justify-between hover:border-lum-slate-light/20 transition-colors cursor-pointer" onClick={() => editItem(item)}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {(item.image || (imageMap as Record<string, string>)[item.slug]) && <img src={item.image || (imageMap as Record<string, string>)[item.slug]} alt="" className="h-12 w-12 rounded-lg object-contain bg-lum-mid border border-lum-panel-border flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-lum-ivory truncate">{item.en?.name || item.slug}</p>
                    <p className="text-[10px] text-lum-slate-warm truncate">{item.slug}</p>
          </div>

                </div>
                <button onClick={(e) => { e.stopPropagation(); const slug = item.slug; setConfirmMsg('Hide this equipment? It won\'t appear on the site.'); setConfirmAction(() => () => { deleteEquipmentApi(slug).catch(() => {}); setHiddenSlugs(current => current.includes(slug) ? current : [...current, slug]); setSavedItems(current => current.filter((s: any) => s.slug !== slug)); setToastMsg('Equipment hidden'); setToastShow(true) }) }} title="Hide this equipment" aria-label="Hide this equipment" className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0 ml-2">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          </>
        )}

        {/* Partners management */}
        {showPartners && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-xs text-lum-slate-warm/70">Add partner logos and website links shown on the public homepage.</p>
                <span className="text-[10px] text-lum-slate-warm/60 flex-shrink-0">{partners.length} total</span>
              </div>
              <p className="text-[10px] text-lum-slate-warm/60 mb-4">Use a square PNG with a transparent background for the cleanest result.</p>

            {/* Add / Edit partner */}
            <div className="lum-card p-4 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lum-slate-light mb-3">{partnerEditIdx !== null ? 'Editing partner' : 'Add a partner'}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="Partner name" className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20" />
                <input value={partnerUrl} onChange={e => setPartnerUrl(e.target.value)} placeholder="Website URL (https://...)" className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20" />
                <div className="flex gap-2">
                  <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setPartnerImg(r.result as string); r.readAsDataURL(f) } }} className="hidden" />
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-slate-light hover:text-lum-ivory transition-colors text-sm flex-1">
                    <ImageIcon className="w-4 h-4" /> {partnerImg ? 'Change' : 'Upload 800×800'}
                  </button>
                </div>
              </div>
              {partnerImg && <img src={partnerImg} alt="" className="h-20 rounded-lg object-contain bg-lum-mid border border-lum-panel-border mb-3" />}
              <div className="flex gap-2">
                <button onClick={async () => {
                  if (!partnerName || !partnerUrl || !partnerImg) { alert('Fill all fields'); return }
                  let updated: typeof partners
                  try {
                    if (partnerEditIdx !== null) {
                      const current = partners[partnerEditIdx]
                      if (current?._id) {
                        await apiUpdatePartner(current._id, { name: partnerName, url: partnerUrl, image: partnerImg })
                      }
                      updated = [...partners]
                      updated[partnerEditIdx] = { ...updated[partnerEditIdx], name: partnerName, src: partnerImg, url: partnerUrl, _default: updated[partnerEditIdx]._default }
                    } else {
                      const res = await apiSavePartner({ name: partnerName, url: partnerUrl, image: partnerImg })
                      updated = [...partners, { name: partnerName, src: partnerImg, url: partnerUrl, _default: false, _id: res?.id }]
                    }
                    setPartners(updated)
                    setPartnerEditIdx(null)
                    setPartnerName(''); setPartnerUrl(''); setPartnerImg(null)
                  } catch {
                    setToastMsg('Unable to save partner')
                    setToastShow(true)
                  }
                }} className="btn-lum-primary text-xs px-5 py-3">{partnerEditIdx !== null ? 'Update Partner' : 'Add Partner'}</button>
                {partnerEditIdx !== null && (
                  <button onClick={() => { setPartnerEditIdx(null); setPartnerName(''); setPartnerUrl(''); setPartnerImg(null) }} className="px-5 py-3 rounded-full border border-lum-panel-border text-lum-slate-warm hover:text-lum-ivory transition-colors text-xs">Cancel</button>
                )}
              </div>
            </div>

            {/* Partner list */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lum-slate-warm/70 mb-3">Saved partners ({partners.length})</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {partners.length === 0 ? (
                <p className="text-sm text-lum-slate-warm/60 col-span-full text-center py-8">No partners added yet</p>
              ) : partners.map((p, i) => (
                <div key={i} className="lum-card p-4 text-center relative cursor-pointer hover:border-lum-slate-light/20 transition-colors" onClick={() => { if (p._default) return; setPartnerName(p.name); setPartnerUrl(p.url); setPartnerImg(p.src); setPartnerEditIdx(i) }}>
                  <button onClick={(e) => { e.stopPropagation(); const idx = i; const partner = partners[idx]; if (partner._default) { setToastMsg('Default partners cannot be deleted'); setToastShow(true); return }; setConfirmMsg('Delete this partner?'); setConfirmAction(() => () => { const u = partners.filter((_, x) => x !== idx); setPartners(u); if (partner._id) deletePartnerApi(partner._id).catch(() => {}); if (partnerEditIdx === idx) { setPartnerEditIdx(null); setPartnerName(''); setPartnerUrl(''); setPartnerImg(null) }; setToastMsg('Partner deleted'); setToastShow(true) }) }} className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <img src={p.src} alt={p.name} className="h-16 mx-auto mb-2 object-contain" />
                  <p className="text-xs font-medium text-lum-ivory truncate">{p.name}</p>
                  <p className="text-[9px] text-lum-slate-warm truncate">{p.url}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Translations editor */}
        {showTranslations && (
          <div>
            <p className="text-xs leading-relaxed text-lum-slate-warm/70 mb-4 max-w-2xl">Export the language table, edit the five language columns in Excel, then import it to update the public interface.</p>

            <div className="flex gap-2 mb-4">
              <button onClick={() => {
                const langs = ['en','uz','kk','ru','ko']
                const data: any[] = []
                transKeys.forEach(key => {
                  const row: any = { key }
                  langs.forEach(l => { row[l] = translations[key]?.[l] || UI_STRINGS[l as keyof typeof UI_STRINGS]?.[key] || UI_STRINGS.en[key] || key })
                  data.push(row)
                })
                const ws = XLSX.utils.json_to_sheet(data)
                const border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
                const ref = ws['!ref']
                const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
                for (let R = range.s.r; R <= range.e.r; R++) {
                  for (let C = range.s.c; C <= range.e.c; C++) {
                    const addr = XLSX.utils.encode_cell({ r: R, c: C })
                    if (!ws[addr]) ws[addr] = { t: 's', v: '' }
                    if (!ws[addr].s) ws[addr].s = {}
                    ws[addr].s.border = border
                    if (R === 0) { ws[addr].s.font = { bold: true } }
                  }
                }
                ws['!cols'] = [{ wch: 30 }, ...langs.map(() => ({ wch: 40 }))]
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Translations')
                XLSX.writeFile(wb, 'translations.xlsx')
              }} className="px-5 py-3 rounded-xl text-xs font-medium bg-lum-slate-light/10 text-lum-ivory hover:bg-lum-slate-light/20 transition-colors">
                Export Excel
              </button>
              <label className="px-5 py-3 rounded-xl text-xs font-medium bg-lum-slate-light/10 text-lum-ivory hover:bg-lum-slate-light/20 transition-colors cursor-pointer">
                Import Excel
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={async e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const buf = await f.arrayBuffer()
                  try {
                    const wb = XLSX.read(buf, { type: 'array' })
                    const ws = wb.Sheets[wb.SheetNames[0]]
                    const rows: any[] = XLSX.utils.sheet_to_json(ws)
                    const updated = { ...translations }
                    const langs = ['en','uz','kk','ru','ko']
                    for (const row of rows) {
                      const key = row.key
                      if (!key) continue
                      for (const lang of langs) {
                        const val = row[lang]
                        if (val && typeof val === 'string') {
                          if (!updated[key]) updated[key] = {}
                          updated[key][lang] = val
                          await fetch('/api/translations', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key, lang, value: val }),
                          })
                        }
                      }
                    }
                    setTranslations(updated)
                    setToastMsg('Translations imported!'); setToastShow(true)
                  } catch {
                    setToastMsg('Invalid Excel file'); setToastShow(true)
                  }
                  e.target.value = ''
                }} />
              </label>
            </div>
          </div>
        )}

        {/* News management */}
        {showNews && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-xs leading-relaxed text-lum-slate-warm/70">Publish updates that appear in the animated slider on the public homepage.</p>
              <span className="text-[10px] text-lum-slate-warm/60 flex-shrink-0">{newsItems.length} published</span>
            </div>

            {/* Add / Edit news */}
            <div className="lum-card p-4 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lum-slate-light mb-3">{newsEditIdx !== null ? 'Editing news post' : 'Create a news post'}</p>
              <input value={newsTitle} onChange={e => setNewsTitle(e.target.value)} placeholder="News title" aria-label="News title" className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20 mb-3" />
              <textarea value={newsDesc} onChange={e => setNewsDesc(e.target.value)} placeholder="News description / content" aria-label="News description" rows={3} className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20 mb-3 resize-none" />
              <label className="block mb-3">
                <span className="block text-[10px] font-medium text-lum-slate-warm/80 mb-1.5">Upload date</span>
                <input type="date" value={newsDate} onChange={e => setNewsDate(e.target.value)} aria-label="News upload date" className="w-full sm:w-56 px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20" />
                <span className="block text-[10px] text-lum-slate-warm/55 mt-1.5">This date appears on the public News section.</span>
              </label>
              <div className="flex items-center gap-3">
                <input ref={newsImgRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setNewsImgs(prev => [...prev, r.result as string]); r.readAsDataURL(f) } }} className="hidden" />
                <button onClick={() => newsImgRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-slate-light hover:text-lum-ivory transition-colors text-sm">
                  <ImageIcon className="w-4 h-4" /> {newsImgs.length > 0 ? `Add Another (${newsImgs.length})` : 'Upload Image'}
                </button>
                {newsImgs.length > 0 && (
                  <button onClick={() => setNewsImgs([])} className="text-[10px] text-red-400 hover:text-red-300">Clear all</button>
                )}
              </div>
              {newsImgs.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {newsImgs.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="h-16 rounded-lg object-cover bg-lum-mid border border-lum-panel-border" />
                      <button onClick={() => setNewsImgs(prev => prev.filter((_, x) => x !== i))} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">&times;</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={saveNews} className="btn-lum-primary text-xs px-5 py-3">{newsEditIdx !== null ? 'Update News' : 'Publish News'}</button>
                {newsEditIdx !== null && (
                  <button onClick={resetNewsForm} className="px-5 py-3 rounded-full border border-lum-panel-border text-lum-slate-warm hover:text-lum-ivory transition-colors text-xs">Cancel</button>
                )}
              </div>
            </div>

            {/* News list */}
            <p className="text-[9px] text-lum-slate-warm/50 tracking-[0.15em] uppercase mb-3">Published News ({newsItems.length})</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsItems.length === 0 ? (
                <p className="text-sm text-lum-slate-warm/60 col-span-full text-center py-8">No news published yet</p>
              ) : newsItems.map((n: any) => (
                <div key={n.id} className="lum-card p-4 flex items-center gap-4 hover:border-lum-slate-light/20 transition-colors">
                  {n.image && <img src={n.image} alt="" className="h-16 w-24 rounded-lg object-cover bg-lum-mid border border-lum-panel-border flex-shrink-0" />}
                  {!n.image && n.images && n.images[0] && <img src={n.images[0]} alt="" className="h-16 w-24 rounded-lg object-cover bg-lum-mid border border-lum-panel-border flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-lum-ivory truncate">{n.title}</p>
                    <p className="text-[10px] text-lum-slate-warm truncate mt-0.5">{n.description}</p>
                    <p className="text-[9px] text-lum-slate-warm/55 mt-1">Uploaded {formatNewsDate(n.upload_date || n.created_at)}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => editNewsItem(n)} title="Edit this news post" aria-label="Edit this news post" className="p-1.5 rounded-lg bg-lum-slate-light/10 text-lum-slate-light hover:bg-lum-slate-light/20 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setConfirmMsg('Delete this news?'); setConfirmAction(() => () => deleteNewsItem(n.id)) }} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        {(editIdx !== null) && (
        <div className="lum-card p-4 md:p-6 mb-6">

          <div className="mb-3">
            <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{t('adminName')}</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {['brand','model','location','quantity'].map(f => {
              const labels: Record<string,string> = { brand: t('adminBrand'), model: t('adminModel'), location: t('adminLocation'), quantity: t('adminQty') }
              return (
              <div key={f}>
                <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{labels[f]}</label>
                <input value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20" />
              </div>)})}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {['purchase_date','installation_date'].map(f => (
              <div key={f}>
                <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{t(f === 'purchase_date' ? 'purchaseDate' : 'installationDate')}</label>
                <input value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20" />
              </div>
            ))}
            <div>
              <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{t('status')}</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20">
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="UNAVAILABLE">UNAVAILABLE</option>
              </select>
            </div>
          </div>

          {/* Image & Manual PDF */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{t('adminImage')}</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-slate-light hover:text-lum-ivory transition-colors text-sm">
                <Upload className="w-4 h-4" /> {image ? t('adminChange') : t('adminUpload')}
              </button>
              {image && (
                <div className="mt-2 relative inline-block">
                  <img src={image} alt="" className="h-20 rounded-lg object-contain bg-lum-mid border border-lum-panel-border" />
                  <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">×</button>
                </div>
              )}
            </div>
            <div>
              <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">Manual (PDF)</label>
              <input ref={manualRef} type="file" accept=".pdf" onChange={handleManual} className="hidden" />
              <button onClick={() => manualRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-slate-light hover:text-lum-ivory transition-colors text-sm">
                <Upload className="w-4 h-4" /> {manual ? 'Change PDF' : 'Upload Manual PDF'}
              </button>
              {manual && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-lum-slate-warm/60">PDF uploaded</span>
                  <button onClick={() => setManual(null)} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                </div>
              )}
            </div>
          </div>

          {/* Saving progress */}
          {saving ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-lum-slate-warm/70">Saving changes...</span>
                <span className="text-xs font-medium text-lum-ivory">{saveProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-lum-soft overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${saveProgress}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-lum-slate-light/40 to-lum-slate-light"
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={saving} className="btn-lum-primary flex items-center gap-2 text-xs px-5 py-3 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" />
              {editIdx !== null ? t('adminUpdate') : t('adminSave')}
            </button>
            <button onClick={resetForm} disabled={saving} className="px-5 py-3 rounded-full border border-lum-panel-border text-lum-slate-warm hover:text-lum-ivory hover:border-lum-slate-light/20 transition-colors text-xs disabled:opacity-50">
              {t('adminCancel')}
            </button>
          </div>
        </div>
        )}

        <ConfirmModal open={!!confirmAction} title="Confirm" message={confirmMsg} onConfirm={confirmAction || (() => {})} onCancel={() => setConfirmAction(null)} />
        <Toast show={toastShow} message={toastMsg} onDone={() => setToastShow(false)} />

      </main>
    </div>
  )
}
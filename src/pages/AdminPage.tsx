import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Upload, LogOut, Eye, EyeOff, Trash2, Menu, X, FilePlus, List, Link2, Database, Image as ImageIcon, Languages } from 'lucide-react'
import * as XLSX from 'xlsx'
import staticEquipments from '../data/equipments.json'
import imageMap from '../data/imageMap.json'
import { useI18n } from '../i18n'
import { UI_STRINGS } from '../i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'
import ThemeToggle from '../components/ThemeToggle'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import RichEditor from '../components/RichEditor'
import { fetchEquipment as apiFetchEquipment, deleteEquipmentApi, savePartner as apiSavePartner, deletePartnerApi } from '../api'

const ADMIN_LOGIN = 'admin'
const ADMIN_PASSWORD = 'admin123'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'uz', label: "O'zbek" },
  { code: 'kk', label: 'Qaraqalpaq' },
  { code: 'ru', label: 'Русский' },
  { code: 'ko', label: '한국어' },
]

interface LangData {
  name: string
  description: string
  purpose: string
  specifications: string
  safety: string
  procedure: string
  maintenance: string
}

interface EquipmentForm {
  slug: string
  lang: Record<string, LangData>
  brand: string
  model: string
  location: string
  quantity: string
  purchase_date: string
  installation_date: string
  status: string
}

function emptyLangData(): LangData {
  return { name: '', description: '', purpose: '', specifications: '', safety: '', procedure: '', maintenance: '' }
}

const emptyForm: EquipmentForm = {
  slug: '',
  lang: { en: emptyLangData(), uz: emptyLangData(), kk: emptyLangData(), ru: emptyLangData(), ko: emptyLangData() },
  brand: '', model: '', location: '', quantity: '',
  purchase_date: '', installation_date: '', status: 'AVIABLE',
}

const DEFAULT_PARTNERS = [
  { name: 'KMI', url: 'https://kkmi.uz/en/', src: '/logos/kmi.svg', _default: true },
  { name: 'Korea University', url: 'https://hes.korea.ac.kr/eng/main/main.html#HOME', src: '/logos/korea-univ.svg', _default: true },
  { name: 'Ministry of Education', url: 'https://www.moe.go.kr/main.do?s=moe', src: '/logos/moe.svg', _default: true },
  { name: 'NRF', url: 'https://www.nrf.re.kr/index', src: '/logos/nrf.svg', _default: true },
]

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
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editIsStatic, setEditIsStatic] = useState(false)
  const [formLang, setFormLang] = useState('en')
  const [showForm, setShowForm] = useState(false)
  const [showEquipList, setShowEquipList] = useState(false)
  const [showPartners, setShowPartners] = useState(false)
  const [showTranslations, setShowTranslations] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [partners, setPartners] = useState<{name: string; src: string; url: string; _default?: boolean}[]>(DEFAULT_PARTNERS)
  const [partnerName, setPartnerName] = useState('')
  const [partnerUrl, setPartnerUrl] = useState('')
  const [partnerImg, setPartnerImg] = useState<string | null>(null)
  const [partnerEditIdx, setPartnerEditIdx] = useState<number | null>(null)
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({})
  const [transKeys, setTransKeys] = useState<string[]>([])
  const [transLang, setTransLang] = useState('ko')
  const [transEditKey, setTransEditKey] = useState('')
  const [transEditVal, setTransEditVal] = useState('')
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
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([])

  useEffect(() => {
    apiFetchEquipment().then(data => {
      if (data && data.length) {
        const admin = data.filter((d: any) => d._overridden)
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
  }, [])

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

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const resetForm = () => { setForm(emptyForm); setImage(null); setEditIdx(null); setFormLang('en'); setShowForm(false) }

  const editItem = (item: any) => {
    setShowForm(true)
    const lang: Record<string, LangData> = {}
    for (const l of LANGUAGES) {
      const d = item[l.code] || item.en || {}
      lang[l.code] = {
        name: d.name || '',
        description: d.description || '',
        purpose: d.purpose || '',
        specifications: d.specifications || '',
        safety: d.safety || '',
        procedure: d.procedure || '',
        maintenance: d.maintenance || '',
      }
    }
    setForm({
      slug: item.slug || '',
      lang,
      brand: item.brand || '',
      model: item.model || '',
      location: item.location || '',
      quantity: item.quantity || '',
      purchase_date: item.purchase_date || '',
      installation_date: item.installation_date || '',
      status: item.status || 'AVIABLE',
    })
    setImage(item.image || null)
    setEditIdx(item.slug)
    setEditIsStatic(!!item._overridden || staticEquipments.some(e => e.slug === item.slug))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!form.lang.en?.name || !form.lang.en?.description) {
      alert('English name and description are required')
      return
    }

    const slug = form.slug || generateSlug(form.lang.en.name)
    const data: any = {
      slug,
      brand: form.brand || '—',
      model: form.model || '—',
      location: form.location || '—',
      quantity: form.quantity || '1',
      purchase_date: form.purchase_date || '—',
      installation_date: form.installation_date || '—',
      status: form.status || 'AVIABLE',
      image: image,
    }
    for (const l of LANGUAGES) {
      const d = form.lang[l.code]
      data[l.code] = {
        name: d.name || form.lang.en.name,
        description: d.description || form.lang.en.description,
        purpose: d.purpose || form.lang.en.purpose || '',
        specifications: d.specifications || form.lang.en.specifications || '',
        safety: d.safety || form.lang.en.safety || '',
        procedure: d.procedure || form.lang.en.procedure || '',
        maintenance: d.maintenance || form.lang.en.maintenance || '',
      }
    }

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
    resetForm()
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

  return (
    <div className="min-h-screen bg-lum-deep">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-lum-mid/80 backdrop-blur-xl border-b border-lum-panel-border">
        <div className="w-full px-2 sm:px-4 py-2.5 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 sm:gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg bg-lum-panel-bg border border-lum-panel-border text-lum-slate-warm hover:text-lum-ivory transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <a href="/#/admin" onClick={() => { setShowForm(false); setShowEquipList(false); setShowPartners(false); setShowTranslations(false); setEditIdx(null); setMenuOpen(false) }}><img src="/korea-univ-logo.svg" alt="Korea University" className="h-8 sm:h-12 w-auto" /></a>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-lum-ivory">고려대학교 IEH</p>
              <p className="text-[10px] text-lum-slate-warm tracking-[0.15em] uppercase">{t('adminPanel')}</p>
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
      <motion.div
        initial={false}
        animate={{ x: menuOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 bottom-0 z-40 w-64 bg-lum-mid border-r border-lum-panel-border pt-20 px-4 overflow-y-auto shadow-2xl"
      >
        <div className="space-y-2">
          <button onClick={() => { setShowEquipList(true); setShowPartners(false); setShowTranslations(false); setEditIdx(null); resetForm(); setMenuOpen(false) }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory font-medium text-sm hover:bg-lum-soft transition-colors">
            <List className="w-4 h-4 text-lum-slate-light" />
            {t('adminAllEq')}
          </button>
          <button onClick={() => { setShowPartners(true); setShowEquipList(false); setShowTranslations(false); setEditIdx(null); setMenuOpen(false) }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-slate-light font-medium text-sm hover:bg-lum-soft transition-colors">
            <Link2 className="w-4 h-4 text-lum-slate-light" />
            Partners
          </button>
          <button onClick={() => { setShowTranslations(true); setShowEquipList(false); setShowPartners(false); setEditIdx(null); loadTranslations(); setMenuOpen(false) }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-slate-light font-medium text-sm hover:bg-lum-soft transition-colors">
            <Languages className="w-4 h-4 text-lum-slate-light" />
            Translations
          </button>
        </div>
      </motion.div>

      <main className="max-w-6xl mx-auto px-4 py-6 relative">
        {/* Admin home - grid background with mouse spotlight */}
        {!editIdx && !showEquipList && !showPartners && !showForm && !showTranslations && (
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
          </>
        )}

        {editIdx !== null ? (
          <h1 className="text-lg font-bold text-lum-ivory mb-6">{t('adminEdit')}</h1>
        ) : showEquipList ? (
          <h1 className="text-lg font-bold text-lum-ivory mb-6">{t('adminAllEq')} ({staticEquipments.length + savedItems.length - hiddenSlugs.length})</h1>
        ) : null}

        {/* Add form + Equipment list (combined) */}
        {showEquipList && !editIdx && (
          <>
            {/* Inline add form */}
            <div className="lum-card p-4 md:p-6 mb-6">
              <p className="text-[9px] text-lum-slate-warm/50 tracking-[0.15em] uppercase mb-4">{t('adminAddNew')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} placeholder={t('adminSlug')} className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20" />
                <input value={form.lang.en?.name || ''} onChange={e => setForm({...form, lang: {...form.lang, en: {...form.lang.en, name: e.target.value}}})} placeholder={t('adminName') + ' (en)'} className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20" />
              </div>
              <RichEditor value={form.lang.en?.description || ''} onChange={html => setForm({...form, lang: {...form.lang, en: {...form.lang.en, description: html}}})} placeholder={t('adminDesc') + ' (en)'} minHeight={60} />
              <button onClick={handleSubmit} className="btn-lum-primary flex items-center gap-2 text-xs px-5 py-3">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>

            {/* Equipment grid */}
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
                <button onClick={(e) => { e.stopPropagation(); const slug = item.slug; setConfirmMsg('Hide this equipment? It won\'t appear on the site.'); setConfirmAction(() => () => { deleteEquipmentApi(slug).catch(() => {}); setSavedItems(savedItems.filter((s: any) => s.slug !== slug)); setToastMsg('Equipment hidden'); setToastShow(true) }) }} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0 ml-2">
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
            <h1 className="text-lg font-bold text-lum-ivory mb-2">{t('partners')}</h1>
            <p className="text-[10px] text-lum-slate-warm/60 mb-4">Upload 800×800px PNG with transparent background</p>

            {/* Add / Edit partner */}
            <div className="lum-card p-4 mb-6">
              <p className="text-[9px] text-lum-slate-warm/50 tracking-[0.15em] uppercase mb-3">{partnerEditIdx !== null ? 'Edit Partner' : 'Add Partner'}</p>
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
                  if (partnerEditIdx !== null) {
                    updated = [...partners]
                    updated[partnerEditIdx] = { ...updated[partnerEditIdx], name: partnerName, src: partnerImg, url: partnerUrl, _default: false }
                  } else {
                    const res = await apiSavePartner({ name: partnerName, url: partnerUrl, image: partnerImg })
                    updated = [...partners, { name: partnerName, src: partnerImg, url: partnerUrl, _default: false, _id: res?.id }]
                  }
                    setPartners(updated)
                    setPartnerEditIdx(null)
                  setPartnerName(''); setPartnerUrl(''); setPartnerImg(null)
                }} className="btn-lum-primary text-xs px-5 py-3">{partnerEditIdx !== null ? 'Update Partner' : 'Add Partner'}</button>
                {partnerEditIdx !== null && (
                  <button onClick={() => { setPartnerEditIdx(null); setPartnerName(''); setPartnerUrl(''); setPartnerImg(null) }} className="px-5 py-3 rounded-full border border-lum-panel-border text-lum-slate-warm hover:text-lum-ivory transition-colors text-xs">Cancel</button>
                )}
              </div>
            </div>

            {/* Partner list */}
            <p className="text-[9px] text-lum-slate-warm/50 tracking-[0.15em] uppercase mb-3">{t('partners')} ({partners.length})</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {partners.length === 0 ? (
                <p className="text-sm text-lum-slate-warm/60 col-span-full text-center py-8">No partners added yet</p>
              ) : partners.map((p, i) => (
                <div key={i} className="lum-card p-4 text-center relative cursor-pointer hover:border-lum-slate-light/20 transition-colors" onClick={() => { setPartnerName(p.name); setPartnerUrl(p.url); setPartnerImg(p.src); setPartnerEditIdx(i) }}>
                  <button onClick={(e) => { e.stopPropagation(); const idx = i; const partner = partners[idx]; setConfirmMsg('Delete this partner?'); setConfirmAction(() => () => { const u = partners.filter((_, x) => x !== idx); setPartners(u); if (partner._id) deletePartnerApi(partner._id).catch(() => {}); if (partnerEditIdx === idx) { setPartnerEditIdx(null); setPartnerName(''); setPartnerUrl(''); setPartnerImg(null) }; setToastMsg('Partner deleted'); setToastShow(true) }) }} className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
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
            <h1 className="text-lg font-bold text-lum-ivory mb-2">Translations</h1>
            <p className="text-[10px] text-lum-slate-warm/60 mb-4">Export to Excel, edit, and import back — all 5 languages included.</p>

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
                const range = XLSX.utils.decode_range(ws['!ref'])
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
                  } catch (err) {
                    setToastMsg('Invalid Excel file'); setToastShow(true)
                  }
                  e.target.value = ''
                }} />
              </label>
            </div>
          </div>
        )}

        {/* Form */}
        {(showForm || editIdx !== null) && (
        <div className="lum-card p-4 md:p-6 mb-6">
          {/* Language tabs */}
          <div className="flex gap-1 mb-4 flex-wrap">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setFormLang(l.code)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  formLang === l.code ? 'bg-lum-slate-light/20 text-lum-ivory' : 'text-lum-slate-warm hover:text-lum-ivory'
                }`}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{t('adminSlug')}</label>
              <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20" />
            </div>
            <div>
              <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{t('adminName')} ({formLang}) *</label>
              <input value={form.lang[formLang]?.name || ''} onChange={e => setForm({...form, lang: {...form.lang, [formLang]: {...form.lang[formLang], name: e.target.value}}})} className="w-full px-3 py-2 rounded-xl bg-lum-panel-bg border border-lum-panel-border text-lum-ivory text-sm outline-none focus:border-lum-slate-light/20" />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{t('adminDesc')} ({formLang}) *</label>
            <RichEditor value={form.lang[formLang]?.description || ''} onChange={html => setForm({...form, lang: {...form.lang, [formLang]: {...form.lang[formLang], description: html}}})} placeholder={t('adminDesc') + ' (' + formLang + ')'} minHeight={80} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{t('purpose')} ({formLang})</label>
              <RichEditor value={form.lang[formLang]?.purpose || ''} onChange={html => setForm({...form, lang: {...form.lang, [formLang]: {...form.lang[formLang], purpose: html}}})} minHeight={80} />
            </div>
            <div>
              <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{t('specifications')} ({formLang})</label>
              <RichEditor value={form.lang[formLang]?.specifications || ''} onChange={html => setForm({...form, lang: {...form.lang, [formLang]: {...form.lang[formLang], specifications: html}}})} minHeight={80} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {['safety','procedure','maintenance'].map(f => (
              <div key={f}>
                <label className="text-[9px] tracking-[0.15em] uppercase text-lum-ivory/80 mb-1 block">{t(f)} ({formLang}) — {t('adminSafety')}</label>
                <RichEditor value={(form.lang[formLang] as any)?.[f] || ''} onChange={html => setForm({...form, lang: {...form.lang, [formLang]: {...form.lang[formLang], [f]: html}}})} minHeight={100} />
              </div>
            ))}
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
                <option value="AVIABLE">AVIABLE</option>
                <option value="UNAVIABLE">UNAVIABLE</option>
              </select>
            </div>
          </div>

          {/* Image */}
          <div className="mb-4">
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

          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} className="btn-lum-primary flex items-center gap-2 text-xs px-5 py-3">
              <Save className="w-3.5 h-3.5" />
              {editIdx !== null ? t('adminUpdate') : t('adminSave')}
            </button>
            <button onClick={resetForm} className="px-5 py-3 rounded-full border border-lum-panel-border text-lum-slate-warm hover:text-lum-ivory hover:border-lum-slate-light/20 transition-colors text-xs">
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
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useI18n } from '../i18n'
import LanguageSwitcher from './LanguageSwitcher'
import LupicLogo from './LupicLogo'

const LINKS = [
  { to: '/', key: 'navHome' },
  { to: '/catalog', key: 'navEquipment' },
  { to: '/training', key: 'navTraining' },
  { to: '/sop', key: 'navSop' },
  { to: '/download', key: 'navDownload' },
  { to: '/about', key: 'navAbout' },
]

export default function SiteHeader() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`) ||
      (to === '/catalog' && (pathname.startsWith('/equipment') || pathname.startsWith('/catalog')))

  return (
    <header className="sticky top-0 z-50 border-b border-lum-panel-border bg-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link to="/" aria-label="LUPIC home" className="flex-shrink-0">
          <LupicLogo />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 xl:flex">
            <img src="/logos/korea-univ.svg" alt="Korea University" className="h-9 w-auto" />
            <span className="h-7 w-px bg-lum-panel-border" />
            <img src="/logos/nrf.svg" alt="National Research Foundation of Korea" className="h-9 w-auto" />
          </div>
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            aria-label={t('navHome')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-lum-panel-border text-lum-navy lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-lum-panel-border bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col">
            {LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-[0.1em] ${
                  isActive(link.to) ? 'bg-lum-accent-soft text-lum-accent' : 'text-lum-slate-light'
                }`}
              >
                {t(link.key)}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 border-t border-lum-panel-border pt-4">
            <img src="/logos/korea-univ.svg" alt="Korea University" className="h-8 w-auto" />
            <img src="/logos/nrf.svg" alt="National Research Foundation of Korea" className="h-8 w-auto" />
          </div>
        </nav>
      )}
    </header>
  )
}

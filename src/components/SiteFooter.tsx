import { Link } from 'react-router-dom'
import { Mail, Globe, MapPin } from 'lucide-react'
import { useI18n } from '../i18n'
import LupicLogo from './LupicLogo'

export default function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="bg-lum-navy text-white">
      <div className="mx-auto grid w-full gap-10 px-4 py-14 md:grid-cols-3 md:px-8">
        <div>
          <LupicLogo light />
          <p className="mt-5 max-w-xs text-xs leading-relaxed text-white/70">
            {t('homeHeroSubtitle')}
          </p>
        </div>

        <div>
          <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-white">{t('contactUsTitle')}</h3>
          <ul className="space-y-3 text-xs text-white/75">
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-lum-accent" />
              <a href="mailto:ku.lupic@gmail.com" className="hover:text-white">ku.lupic@gmail.com</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Globe className="h-4 w-4 text-lum-accent" />
              <a href="https://hes.korea.ac.kr/eng/main/main.html#HOME" target="_blank" rel="noopener noreferrer" className="hover:text-white">Korea University</a>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-lum-accent" />
              <span>{t('footerLocation')}</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-white">{t('followUsTitle')}</h3>
          <div className="flex items-center gap-3">
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-lum-accent hover:text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full flex-col items-center justify-between gap-3 px-4 py-5 text-[11px] text-white/60 md:flex-row md:px-8">
          <p>&copy; {new Date().getFullYear()} Korea University. {t('rightsReserved')}</p>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="hover:text-white">{t('adminLink')}</Link>
            <span className="h-3 w-px bg-white/20" />
            <Link to="/privacy" className="hover:text-white">{t('privacyPolicy')}</Link>
            <span className="h-3 w-px bg-white/20" />
            <Link to="/terms" className="hover:text-white">{t('termsOfUse')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

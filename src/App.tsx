import { Routes, Route, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import { ArrowUp } from 'lucide-react'
import { I18nProvider, useI18n } from './i18n'
import { ThemeProvider } from './ThemeContext'
import HomePage from './pages/HomePage'
import EquipmentPage from './pages/EquipmentPage'
import AdminPage from './pages/AdminPage'
import CatalogPage from './pages/CatalogPage'

function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-lum-slate-light/10 border border-lum-panel-border backdrop-blur-xl flex items-center justify-center shadow-2xl hover:bg-lum-slate-light/20 active:bg-lum-slate-light/30 transition-colors shadow-lum-slate-light/20 shadow-lg"
        >
          <ArrowUp className="w-5 h-5 text-lum-slate-light drop-shadow-[0_0_6px_rgba(176,184,196,0.5)]" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function AnimatedRoutes() {
  const { lang, t } = useI18n()
  const location = useLocation()
  const prevLang = useRef(lang)
  const [greeting, setGreeting] = useState<string | null>(null)
  const [displayedText, setDisplayedText] = useState<string[]>([])
  const [showGreeting, setShowGreeting] = useState(false)
  const [rippling, setRippling] = useState(false)

  useEffect(() => {
    if (prevLang.current !== lang) {
      if (!location.pathname.startsWith('/admin')) {
        const msg = t('greeting')
        setGreeting(msg)
        setShowGreeting(true)
        setDisplayedText([])
        setRippling(false)

        // Show all characters at once with staggered wave
        const chars = msg.split('')
        setDisplayedText(chars)
        setTimeout(() => setRippling(true), 800)
        setTimeout(() => {
          setShowGreeting(false)
          setTimeout(() => { setGreeting(null); setRippling(false) }, 300)
        }, 1800)
      }
      prevLang.current = lang
    }
  }, [lang, t, location])

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/equipment/:slug" element={<EquipmentPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {/* Greeting toast - typewriter style */}
      <AnimatePresence>
        {greeting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showGreeting ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => { setShowGreeting(false); setTimeout(() => { setGreeting(null); setRippling(false) }, 300) }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ backgroundColor: '#0F1115' }}
          >
            {/* Rings */}
            {rippling && (
              <>
                <motion.span
                  initial={{ opacity: 0.5, scale: 0 }}
                  animate={{ opacity: 0, scale: 4 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute w-32 h-32 rounded-full border border-white/20"
                />
                <motion.span
                  initial={{ opacity: 0.4, scale: 0 }}
                  animate={{ opacity: 0, scale: 4 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  className="absolute w-40 h-40 rounded-full border border-white/15"
                />
                <motion.span
                  initial={{ opacity: 0.3, scale: 0 }}
                  animate={{ opacity: 0, scale: 4 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  className="absolute w-48 h-48 rounded-full border border-white/10"
                />
              </>
            )}
            {/* Lottie background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <dotlottie-wc
                src="https://lottie.host/9935dd26-5e32-4a46-beb6-d68b32896c22/Jn60r5uNap.lottie"
                style={{ width: 'min(400px, 80vw)', height: 'min(400px, 80vw)' }}
                autoplay
                loop
              ></dotlottie-wc>
            </div>
            <motion.p
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
              animate={showGreeting ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(1.8rem,7vw,4.5rem)] font-light text-white/90 tracking-tight relative z-10"
              style={{ fontFamily: "'Noto Serif KR', serif" }}
            >
              <span className={`relative inline-block ${rippling ? 'ring-fade' : ''}`}>
                <span className="inline-flex" style={{ whiteSpace: 'pre' }}>
                  {displayedText.map((char, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05, ease: [0, 0.55, 0.45, 1] }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              </span>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to top button */}
      <ScrollToTop />

    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AnimatedRoutes />
      </I18nProvider>
    </ThemeProvider>
  )
}

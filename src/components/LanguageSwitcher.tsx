import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

import { useI18n, LANGUAGES, type Lang } from '../i18n'

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find(l => l.code === lang)!

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-full bg-lum-panel-bg border border-lum-panel-border text-lum-slate-light hover:text-lum-ivory transition-all duration-500 backdrop-blur-xl text-xs tracking-[0.1em]"
      >
        {current.flag === 'kk' ? (
          <img src="/flags/kk.svg" className="w-4 h-4 rounded-sm" />
        ) : (
          <span className={`fi fi-${current.flag} w-4 h-4`} />
        )}
        <span className="text-[10px] font-medium">{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-500 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-12 z-50 bg-lum-mid border border-lum-panel-border rounded-2xl overflow-hidden min-w-[160px] backdrop-blur-xl shadow-2xl"
          >
            {LANGUAGES.map((l, i) => (
              <motion.button
                key={l.code}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.1, x: 6 }}
                whileTap={{ scale: 0.97 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => { setLang(l.code as Lang); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left text-xs transition-colors ${
                  l.code === lang ? 'bg-lum-soft text-lum-ivory font-semibold' : 'text-lum-slate-warm'
                }`}
              >
                {l.flag === 'kk' ? <img src="/flags/kk.svg" className="w-4 h-4 rounded-sm" /> : <span className={`fi fi-${l.flag} w-4 h-4`} />}
                <span>{l.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
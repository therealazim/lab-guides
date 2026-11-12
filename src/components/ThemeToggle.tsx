import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import { useI18n } from '../i18n'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { t } = useI18n()
  const isDark = theme === 'dark'
  const actionLabel = isDark ? t('themeToLight') : t('themeToDark')

  return (
    <button
      onClick={toggle}
      className="relative w-[54px] h-[30px] rounded-full transition-colors duration-500 border backdrop-blur-xl touch-manipulation"
      style={{
        backgroundColor: isDark ? 'rgba(22,26,32,0.55)' : 'rgba(255,255,255,0.7)',
        borderColor: isDark ? 'rgba(156,163,175,0.08)' : 'rgba(0,0,0,0.12)',
      }}
      title={actionLabel}
      aria-label={actionLabel}
    >
      {/* Icons */}
      <Sun className="absolute left-[7px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-amber-400 z-10" />
      <Moon className="absolute right-[7px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-lum-slate-light z-10" />
      {/* Knob */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="absolute top-[6px] w-[18px] h-[18px] rounded-full bg-white shadow-md z-20"
        style={{
          left: isDark ? '3px' : '33px',
        }}
      />
    </button>
  )
}
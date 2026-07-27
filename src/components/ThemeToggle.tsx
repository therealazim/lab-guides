import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      className="relative w-[52px] h-[28px] rounded-full transition-colors duration-500 border backdrop-blur-xl"
      style={{
        backgroundColor: isDark ? 'rgba(22,26,32,0.55)' : 'rgba(255,255,255,0.7)',
        borderColor: isDark ? 'rgba(156,163,175,0.08)' : 'rgba(0,0,0,0.12)',
      }}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Icons */}
      <Sun className="absolute left-[7px] top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400 z-10" />
      <Moon className="absolute right-[7px] top-1/2 -translate-y-1/2 w-3 h-3 text-lum-slate-light z-10" />
      {/* Knob */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-md z-20"
        style={{
          left: isDark ? '3px' : '27px',
        }}
      />
    </button>
  )
}
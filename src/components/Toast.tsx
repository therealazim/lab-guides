import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

interface Props {
  show: boolean
  message: string
  onDone: () => void
}

export default function Toast({ show, message, onDone }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={() => setTimeout(onDone, 2000)}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-xl shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
          >
            <Check className="w-5 h-5 text-emerald-400" />
          </motion.div>
          <span className="text-sm font-medium text-emerald-300">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../i18n'

interface Props {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }: Props) {
  const { t } = useI18n()
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="lum-card p-6 max-w-sm w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-lum-ivory mb-2">{title}</h3>
            <p className="text-sm text-lum-slate-light mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={onCancel} className="px-4 py-2 rounded-full border border-lum-panel-border text-lum-slate-warm hover:text-lum-ivory transition-colors text-xs">{t('adminCancel')}</button>
              <button onClick={() => { onConfirm(); onCancel() }} className="px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-medium">{t('adminDelete')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
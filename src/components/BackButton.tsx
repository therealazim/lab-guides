import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../i18n'

type Props = {
  fallback?: string
  label?: string
  className?: string
}

export default function BackButton({ fallback = '/', label, className = '' }: Props) {
  const navigate = useNavigate()
  const { t } = useI18n()

  const goBack = () => {
    const state = window.history.state
    const idx = state && typeof state.idx === 'number' ? state.idx : 0
    if (idx > 0) navigate(-1)
    else navigate(fallback)
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-lum-slate-warm transition-colors hover:text-lum-accent ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>{label || t('back')}</span>
    </button>
  )
}

import { useState, useRef, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import { useEditMode } from '../EditModeContext'

interface EditableProps {
  text: string
  contentKey: string
  onSave: (key: string, value: string) => Promise<void>
  className?: string
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div'
}

export default function Editable({ text, contentKey, onSave, className = '', tag: Tag = 'span' }: EditableProps) {
  const { editMode } = useEditMode()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(text) }, [text])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  if (!editMode) {
    return <Tag className={className}>{text}</Tag>
  }

  if (editing) {
    return (
      <span className="relative inline-flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={async e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setSaving(true)
              await onSave(contentKey, draft)
              setSaving(false)
              setEditing(false)
            }
            if (e.key === 'Escape') {
              setDraft(text)
              setEditing(false)
            }
          }}
          onBlur={async () => {
            setSaving(true)
            await onSave(contentKey, draft)
            setSaving(false)
            setEditing(false)
          }}
          className="bg-lum-mid border border-lum-slate-light/30 rounded px-2 py-0.5 text-sm text-lum-ivory outline-none min-w-[120px]"
        />
        {saving && <span className="text-[10px] text-lum-slate-warm/50">...</span>}
      </span>
    )
  }

  return (
    <span className="relative inline-flex items-center group">
      <Tag className={className}>{text}</Tag>
      <button
        onClick={() => setEditing(true)}
        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded bg-lum-slate-light/10 hover:bg-lum-slate-light/20"
      >
        <Pencil className="w-3 h-3 text-lum-slate-light" />
      </button>
    </span>
  )
}

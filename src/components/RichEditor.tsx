import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered } from 'lucide-react'

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

function Toolbar({ editor }: { editor: any }) {
  if (!editor) return null
  const btn = (active: boolean, onClick: () => void, icon: any) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-lum-slate-light/20 text-lum-ivory' : 'text-lum-slate-warm hover:text-lum-ivory'}`}
    >
      {icon}
    </button>
  )
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-lum-panel-border bg-lum-soft/50 rounded-t-xl">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold className="w-3.5 h-3.5" />)}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic className="w-3.5 h-3.5" />)}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="w-3.5 h-3.5" />)}
      <span className="w-px h-4 bg-lum-panel-border mx-1" />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List className="w-3.5 h-3.5" />)}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="w-3.5 h-3.5" />)}
    </div>
  )
}

export default function RichEditor({ value, onChange, placeholder = '', minHeight = 120 }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none text-lum-ivory outline-none px-3 py-2 text-sm min-h-[80px]',
        style: `min-height: ${minHeight}px`,
      },
    },
  })

  return (
    <div className="rounded-xl border border-lum-panel-border bg-lum-panel-bg overflow-hidden focus-within:border-lum-slate-light/20 transition-colors">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

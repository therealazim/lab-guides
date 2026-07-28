import { createContext, useContext, useState, type ReactNode } from 'react'

interface EditModeContextType {
  editMode: boolean
  setEditMode: (v: boolean) => void
}

const EditModeContext = createContext<EditModeContextType>({ editMode: false, setEditMode: () => {} })

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false)
  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>{children}</EditModeContext.Provider>
  )
}

export function useEditMode() {
  return useContext(EditModeContext)
}

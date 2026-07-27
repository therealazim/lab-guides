const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'

async function req(path, options = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return r.json()
}

export const fetchEquipment = () => req('/equipment')
export const fetchEquipmentBySlug = (slug) => req(`/equipment/${slug}`)
export const saveEquipment = (item) => req('/equipment', { method: 'POST', body: JSON.stringify(item) })
export const deleteEquipmentApi = (slug) => req(`/equipment/${slug}`, { method: 'DELETE' })
export const fetchPartners = () => req('/partners')
export const savePartner = (partner) => req('/partners', { method: 'POST', body: JSON.stringify(partner) })
export const updatePartner = (id, partner) => req(`/partners/${id}`, { method: 'PUT', body: JSON.stringify(partner) })
export const deletePartnerApi = (id) => req(`/partners/${id}`, { method: 'DELETE' })
export const seedDatabase = (data) => req('/seed', { method: 'POST', body: JSON.stringify(data) })
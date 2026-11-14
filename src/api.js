const API = '/api'
let csrfToken = ''

async function req(path, options = {}, retried = false) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (csrfToken && method !== 'GET' && method !== 'HEAD') {
    headers['X-CSRF-Token'] = csrfToken
  }
  const r = await fetch(`${API}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers,
  })
  let data = null
  try { data = await r.json() } catch { data = null }
  if (!r.ok) {
    const message = data?.error || `Request failed with status ${r.status}`
    if (r.status === 401 && !path.startsWith('/auth/')) {
      try {
        if (!sessionStorage.getItem('lupic-auth-reload')) {
          sessionStorage.setItem('lupic-auth-reload', '1')
          setTimeout(() => window.location.reload(), 50)
        }
      } catch {}
    }
    if (r.status === 403 && !retried && /csrf/i.test(message)) {
      try {
        const session = await req('/auth/session')
        csrfToken = session?.csrfToken || ''
        if (csrfToken) return req(path, options, true)
      } catch {}
    }
    throw new Error(message)
  }
  try { sessionStorage.removeItem('lupic-auth-reload') } catch {}
  return data
}

export const fetchEquipment = () => req('/equipment')
export const fetchHiddenEquipment = () => req('/hidden-equipment')
export const fetchHiddenEquipmentDetails = () => req('/hidden-equipment/details')
export const restoreEquipmentApi = (slug) => req(`/equipment/${slug}/restore`, { method: 'POST' })
export const deleteHiddenEquipmentApi = (slug) => req(`/hidden-equipment/${slug}`, { method: 'DELETE' })
export const fetchEquipmentBySlug = (slug) => req(`/equipment/${slug}`)
export const saveEquipment = (item) => req('/equipment', { method: 'POST', body: JSON.stringify(item) })
export const deleteEquipmentApi = (slug) => req(`/equipment/${slug}`, { method: 'DELETE' })
export const saveNews = (item) => req('/news', { method: 'POST', body: JSON.stringify(item) })
export const deleteNewsApi = (id) => req(`/news/${id}`, { method: 'DELETE' })
export const saveTranslation = (entry) => req('/translations', { method: 'POST', body: JSON.stringify(entry) })
export const fetchPartners = () => req('/partners')
export const savePartner = (partner) => req('/partners', { method: 'POST', body: JSON.stringify(partner) })
export const updatePartner = (id, partner) => req(`/partners/${id}`, { method: 'PUT', body: JSON.stringify(partner) })
export const deletePartnerApi = (id) => req(`/partners/${id}`, { method: 'DELETE' })
export const getAdminSession = () => req('/auth/session').then(data => {
  csrfToken = data?.csrfToken || ''
  return data
})
export const loginAdmin = (username, password) => req('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password }),
}).then(data => {
  csrfToken = data?.csrfToken || csrfToken
  return data
})
export const logoutAdmin = () => req('/auth/logout', { method: 'POST' }).then(data => {
  csrfToken = ''
  return data
})
export const seedDatabase = (data) => req('/seed', { method: 'POST', body: JSON.stringify(data) })

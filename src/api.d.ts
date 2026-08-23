export function fetchEquipment(): Promise<any[]>
export function fetchHiddenEquipment(): Promise<string[]>
export function fetchEquipmentBySlug(slug: string): Promise<any>
export function saveEquipment(item: any): Promise<any>
export function deleteEquipmentApi(slug: string): Promise<any>
export function fetchPartners(): Promise<any[]>
export function savePartner(partner: any): Promise<any>
export function updatePartner(id: number, partner: any): Promise<any>
export function deletePartnerApi(id: number): Promise<any>
export function getAdminSession(): Promise<{ authenticated: boolean }>
export function loginAdmin(username: string, password: string): Promise<any>
export function logoutAdmin(): Promise<any>
export function seedDatabase(data: any[]): Promise<any>

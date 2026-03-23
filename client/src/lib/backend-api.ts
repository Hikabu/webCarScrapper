import type { Car } from '@/lib/types'

export interface TokenResponse {
  access_token: string
  token_type: string
}

export type CarsSortBy = 'total_price' | 'mileage' | 'year' | 'created_at'
export type CarsSortOrder = 'asc' | 'desc'

export interface CarsListQueryParams {
  brand?: string
  body_type?: string
  transmission?: string

  min_price?: number
  max_price?: number
  min_year?: number
  max_year?: number
  min_mileage?: number
  max_mileage?: number

  is_new_like?: boolean
  non_smoker?: boolean
  damaged?: boolean

  sort_by?: CarsSortBy
  sort_order?: CarsSortOrder

  page?: number
  page_size?: number
}

export interface CarsListResponse {
  items: Car[]
  total: number
  page: number
  page_size: number
  pages: number
}

const TOKEN_KEY = 'carmarket_access_token'

// Prefer calling our Next proxy (`/api/*`) to avoid CORS issues and to work in Docker.
// If `NEXT_PUBLIC_API_BASE_URL` is set to a loopback address, it will fail in containers,
// so we fall back to `/api` proxy in that case.
const apiBaseFromEnv = process.env.NEXT_PUBLIC_API_BASE_URL
const API_BASE_URL =
  apiBaseFromEnv && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|$)/.test(apiBaseFromEnv)
    ? apiBaseFromEnv
    : '/api'

function isBrowser() {
  return typeof window !== 'undefined'
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function setAccessToken(token: string) {
  if (!isBrowser()) return
  localStorage.setItem(TOKEN_KEY, token)
}

function clearAccessToken() {
  if (!isBrowser()) return
  localStorage.removeItem(TOKEN_KEY)
}

function redirectToLogin() {
  if (!isBrowser()) return
  clearAccessToken()
  window.location.assign('/login')
}

async function apiRequest<T>(
  path: string,
  opts: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
    requiresAuth?: boolean
  },
): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = {}

  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (opts.requiresAuth && token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  if (res.status === 401) {
    // Only redirect automatically when the request requires auth.
    // During login attempts (wrong credentials) we must not bounce to /login,
    // so the UI can show an inline error.
    if (opts.requiresAuth) redirectToLogin()
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Request failed: ${res.status} ${text}`)
  }

  return (await res.json()) as T
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { username, password },
    requiresAuth: false,
  })
    .then((tokenRes) => {
      setAccessToken(tokenRes.access_token)
      return tokenRes
    })
}

export async function logout(): Promise<void> {
  // Logout is stateless (backend ignores token), but we still pass auth if we have it.
  try {
    await apiRequest('/auth/logout', { method: 'POST', requiresAuth: true })
  } finally {
    clearAccessToken()
  }
}

function buildQuery(params: CarsListQueryParams): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    if (typeof v === 'boolean') p.set(k, v ? 'true' : 'false')
    else p.set(k, String(v))
  }
  return p.toString()
}

export async function getCars(params: CarsListQueryParams): Promise<CarsListResponse> {
  const query = buildQuery(params)
  const raw = await apiRequest<{
    items: Array<{
      id: string
      brand: string | null
      total_price: number | null
      image: string | null
      year: number | null
      mileage: number | null
      body_type: string | null
      color: string | null
    }>
    total: number
    page: number
    page_size: number
    pages: number
  }>(`/cars${query ? `?${query}` : ''}`, { method: 'GET', requiresAuth: true })

  return {
    items: raw.items.map((c) => ({
      id: c.id,
      brand: c.brand,
      totalPrice: c.total_price,
      image: c.image,
      year: c.year,
      mileage: c.mileage,
      bodyType: c.body_type,
      color: c.color,
    })),
    total: raw.total,
    page: raw.page,
    page_size: raw.page_size,
    pages: raw.pages,
  }
}

export async function getCarById(id: string): Promise<Car> {
  const raw = await apiRequest<{
    id: string
    brand: string | null
    total_price: number | null
    vehicle_price: number | null
    image: string | null
    body_type: string | null
    color: string | null
    features: string[] | null
    year: number | null
    mileage: number | null
    inspection: string | null
    repair_history: string | null
    warranty: string | null
    maintenance: string | null
    engine_cc: number | null
    transmission: string | null
    is_new_like: boolean | null
    non_smoker: boolean | null
    damaged: boolean | null
  }>(`/cars/${encodeURIComponent(id)}`, { method: 'GET', requiresAuth: true })

  return {
    id: raw.id,
    brand: raw.brand,
    totalPrice: raw.total_price,
    vehiclePrice: raw.vehicle_price,
    image: raw.image,
    bodyType: raw.body_type,
    color: raw.color,
    features: raw.features,
    year: raw.year,
    mileage: raw.mileage,
    inspection: raw.inspection,
    repairHistory: raw.repair_history,
    warranty: raw.warranty,
    maintenance: raw.maintenance,
    engine_cc: raw.engine_cc,
    transmission: raw.transmission,
    isNewLike: raw.is_new_like,
    nonSmoker: raw.non_smoker,
    damaged: raw.damaged,
  }
}


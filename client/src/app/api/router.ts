import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { mockCars } from '@/lib/mock-data'

const VALID_USER = { email: 'admin@carmarket.com', password: 'password123' }

export async function POSTauth(req: NextRequest) {
  const { email, password } = await req.json()
  if (email === VALID_USER.email && password === VALID_USER.password) {
    const cookieStore = await cookies()
    cookieStore.set('session', email, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86400 })
    return NextResponse.json({ email })
  }
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}

export async function GETauth() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')
  if (session?.value) return NextResponse.json({ email: session.value })
  return NextResponse.json({ email: null })
}

export async function DELETEauth() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  return NextResponse.json({ success: true })
}

export async function GETcars(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search = searchParams.get('search')?.toLowerCase()
  const brands = searchParams.getAll('brand')
  const bodyTypes = searchParams.getAll('bodyType')
  const transmissions = searchParams.getAll('transmission')
  const minPrice = Number(searchParams.get('minPrice')) || 0
  const maxPrice = Number(searchParams.get('maxPrice')) || Infinity
  const minYear = Number(searchParams.get('minYear')) || 0
  const maxYear = Number(searchParams.get('maxYear')) || Infinity
  const sort = searchParams.get('sort') || 'recent'

  let cars = mockCars.filter(car => {
    if (search && !car.brand.toLowerCase().includes(search) && !car.bodyType.toLowerCase().includes(search) && !car.color.toLowerCase().includes(search)) return false
    if (brands.length && !brands.some(b => car.brand.startsWith(b))) return false
    if (bodyTypes.length && !bodyTypes.includes(car.bodyType)) return false
    if (transmissions.length && !transmissions.includes(car.transmission)) return false
    if (car.totalPrice < minPrice || car.totalPrice > maxPrice) return false
    if (car.year < minYear || car.year > maxYear) return false
    return true
  })

  const sortFns: Record<string, (a: typeof cars[0], b: typeof cars[0]) => number> = {
    'price-asc': (a, b) => a.totalPrice - b.totalPrice,
    'price-desc': (a, b) => b.totalPrice - a.totalPrice,
    'mileage': (a, b) => a.mileage - b.mileage,
    'year': (a, b) => b.year - a.year,
    'recent': (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  }
  cars.sort(sortFns[sort] || sortFns['recent'])

  const filterOptions = {
    brands: [...new Set(mockCars.map(c => c.brand.split(' ')[0]))],
    bodyTypes: [...new Set(mockCars.map(c => c.bodyType))],
    transmissions: [...new Set(mockCars.map(c => c.transmission))],
    priceRange: [Math.min(...mockCars.map(c => c.totalPrice)), Math.max(...mockCars.map(c => c.totalPrice))],
    yearRange: [Math.min(...mockCars.map(c => c.year)), Math.max(...mockCars.map(c => c.year))]
  }

  return NextResponse.json({ cars, filterOptions, total: mockCars.length })
}

export async function GETcarDetails(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const car = mockCars.find(c => c.id === id)
  if (!car) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(car)
}



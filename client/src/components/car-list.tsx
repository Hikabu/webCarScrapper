'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

import { getCars, type CarsListQueryParams, type CarsListResponse } from '@/lib/backend-api'
import { useAuth } from '@/lib/auth-context'
import type { Car } from '@/lib/types'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Search, SlidersHorizontal, X, RefreshCw } from 'lucide-react'

interface FilterState {
  search: string
  brands: string[]
  bodyTypes: string[]
  transmissions: string[]
  priceRange: [number, number]
  yearRange: [number, number]
  sort: string
}

const PRICE_MIN_DEFAULT = 0
const PRICE_MAX_DEFAULT = 200000
const YEAR_MIN_DEFAULT = 2020
const YEAR_MAX_DEFAULT = 2025

const transmissionOptions = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
  { value: 'cvt', label: 'CVT' },
] as const

const sortToQuery = (sort: string): Pick<CarsListQueryParams, 'sort_by' | 'sort_order'> => {
  switch (sort) {
    case 'price-asc':
      return { sort_by: 'total_price', sort_order: 'asc' }
    case 'price-desc':
      return { sort_by: 'total_price', sort_order: 'desc' }
    case 'mileage':
      return { sort_by: 'mileage', sort_order: 'asc' }
    case 'year':
      return { sort_by: 'year', sort_order: 'desc' }
    case 'recent':
    default:
      return { sort_by: 'created_at', sort_order: 'desc' }
  }
}

function formatYen(val: number | null | undefined) {
  if (val === null || val === undefined) return '—'
  return `¥${Math.round(val).toLocaleString('en-US')}`
}

function formatNullableNumber(val: number | null | undefined) {
  return val === null || val === undefined ? '—' : val.toLocaleString()
}

export function CarList() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    brands: [],
    bodyTypes: [],
    transmissions: [],
    priceRange: [PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT],
    yearRange: [YEAR_MIN_DEFAULT, YEAR_MAX_DEFAULT],
    sort: 'recent',
  })
  const [open, setOpen] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number }>({
    min: PRICE_MIN_DEFAULT,
    max: PRICE_MAX_DEFAULT,
  })
  const [priceRangeDraft, setPriceRangeDraft] = useState<[number, number]>([
    PRICE_MIN_DEFAULT,
    PRICE_MAX_DEFAULT,
  ])
  const priceDraftPending = useRef<[number, number]>([PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT])
  const priceDraftRaf = useRef<number | null>(null)
  const [yearBounds, setYearBounds] = useState<{ min: number; max: number }>({
    min: YEAR_MIN_DEFAULT,
    max: YEAR_MAX_DEFAULT,
  })
  const [yearRangeDraft, setYearRangeDraft] = useState<[number, number]>([
    YEAR_MIN_DEFAULT,
    YEAR_MAX_DEFAULT,
  ])
  const yearDraftPending = useRef<[number, number]>([YEAR_MIN_DEFAULT, YEAR_MAX_DEFAULT])
  const yearDraftRaf = useRef<number | null>(null)
  const priceCommitTimeout = useRef<number | null>(null)
  const yearCommitTimeout = useRef<number | null>(null)
  const [boundsInitialized, setBoundsInitialized] = useState(false)

  // Auth gate: any page that needs auth should redirect if token is missing.
  useEffect(() => {
    if (authLoading) return
    if (!user) router.push('/login')
  }, [authLoading, user, router])

  // If filters change, re-fetch from page 1.
  useEffect(() => {
    setPage(1)
  }, [filters])

const queryParams: CarsListQueryParams = useMemo(() => {
  const brand =
    filters.brands.length > 0 ? filters.brands.join(',') : (filters.search ? filters.search : undefined)

  // Only send min/max if user actually changed the slider bounds.
  const minPrice = filters.priceRange[0] !== priceBounds.min ? filters.priceRange[0] : undefined
  const maxPrice = filters.priceRange[1] !== priceBounds.max ? filters.priceRange[1] : undefined
  const minYear = filters.yearRange[0] !== yearBounds.min ? filters.yearRange[0] : undefined
  const maxYear = filters.yearRange[1] !== yearBounds.max ? filters.yearRange[1] : undefined

  return {
    brand,
    body_type: filters.bodyTypes.length > 0 ? filters.bodyTypes.join(',') : undefined,
    transmission: filters.transmissions.length > 0 ? filters.transmissions.join(',') : undefined,
    min_price: minPrice,
    max_price: maxPrice,
    min_year: minYear,
    max_year: maxYear,
    ...sortToQuery(filters.sort),
    page,
    page_size: pageSize,
  }
}, [filters, page, pageSize, priceBounds.min, priceBounds.max, yearBounds.min, yearBounds.max])

  const { data, isLoading, error, mutate, isValidating } = useSWR<CarsListResponse>(
    user ? ['cars', JSON.stringify(queryParams)] : null,
    () => getCars(queryParams),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  const toggle = (arr: string[], val: string) => (arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  const priceDraftActive = priceRangeDraft[0] !== priceBounds.min || priceRangeDraft[1] !== priceBounds.max
  const yearDraftActive = yearRangeDraft[0] !== yearBounds.min || yearRangeDraft[1] !== yearBounds.max
  const activeCount =
    (filters.search.trim().length > 0 ? 1 : 0) +
    filters.brands.length +
    filters.bodyTypes.length +
    filters.transmissions.length +
    (priceDraftActive ? 1 : 0) +
    (yearDraftActive ? 1 : 0)

  const brandsFromData = useMemo(() => {
    const vals = (data?.items ?? []).map((c) => c.brand).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    return Array.from(new Set(vals))
  }, [data])

  const bodyTypesFromData = useMemo(() => {
    const vals = (data?.items ?? []).map((c) => c.bodyType).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    return Array.from(new Set(vals))
  }, [data])

  useEffect(() => {
    if (boundsInitialized) return
    if (!data?.items?.length) return

    const prices = data.items.map((i) => i.totalPrice).filter((v): v is number => typeof v === 'number')
    const years = data.items.map((i) => i.year).filter((v): v is number => typeof v === 'number')

    const nextPriceBounds = prices.length
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : { min: PRICE_MIN_DEFAULT, max: PRICE_MAX_DEFAULT }
    const nextYearBounds = years.length
      ? { min: Math.min(...years), max: Math.max(...years) }
      : { min: YEAR_MIN_DEFAULT, max: YEAR_MAX_DEFAULT }

    setPriceBounds(nextPriceBounds)
    setYearBounds(nextYearBounds)
    setPriceRangeDraft([nextPriceBounds.min, nextPriceBounds.max])
    setYearRangeDraft([nextYearBounds.min, nextYearBounds.max])
    setFilters(f => ({
      ...f,
      priceRange: [nextPriceBounds.min, nextPriceBounds.max],
      yearRange: [nextYearBounds.min, nextYearBounds.max],
    }))
    setBoundsInitialized(true)
  }, [data, boundsInitialized])

  const priceStep = useMemo(() => {
    const span = priceBounds.max - priceBounds.min
    if (span <= 250000) return 1000
    if (span <= 1500000) return 5000
    return 10000
  }, [priceBounds.max, priceBounds.min])

  if (authLoading) return null
  if (!user) return null

  const resetAllFilters = () => {
    if (priceCommitTimeout.current !== null) {
      window.clearTimeout(priceCommitTimeout.current)
      priceCommitTimeout.current = null
    }
    if (yearCommitTimeout.current !== null) {
      window.clearTimeout(yearCommitTimeout.current)
      yearCommitTimeout.current = null
    }
    setFilters({
      search: '',
      brands: [],
      bodyTypes: [],
      transmissions: [],
      priceRange: [priceBounds.min, priceBounds.max],
      yearRange: [yearBounds.min, yearBounds.max],
      sort: 'recent',
    })
    setPriceRangeDraft([priceBounds.min, priceBounds.max])
    setYearRangeDraft([yearBounds.min, yearBounds.max])
    setPage(1)
  }

  const FilterPanel = ({ onClose }: { onClose?: () => void }) => (
    <div className="h-full flex flex-col bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Filters</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={resetAllFilters} disabled={activeCount === 0}>
            Reset
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Price Range</Label>
            <Slider
              min={priceBounds.min}
              max={priceBounds.max}
              step={priceStep}
              value={[priceRangeDraft[0], priceRangeDraft[1]]}
              onValueChange={(v) => {
                const next: [number, number] = [v[0], v[1]]
                priceDraftPending.current = next
                if (priceDraftRaf.current !== null) return
                priceDraftRaf.current = window.requestAnimationFrame(() => {
                  priceDraftRaf.current = null
                  setPriceRangeDraft(priceDraftPending.current)
                })

                // Debounce the actual applied filter update so the UI stays smooth.
                if (priceCommitTimeout.current !== null) window.clearTimeout(priceCommitTimeout.current)
                priceCommitTimeout.current = window.setTimeout(() => {
                  const [minV, maxV] = priceDraftPending.current
                  setFilters(f => ({ ...f, priceRange: [minV, maxV] }))
                  setPage(1)
                }, 250)
              }}
              onValueCommit={(v) => {
                if (priceCommitTimeout.current !== null) {
                  window.clearTimeout(priceCommitTimeout.current)
                  priceCommitTimeout.current = null
                }
                setFilters(f => ({ ...f, priceRange: [v[0], v[1]] }))
                setPage(1)
              }}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatYen(priceRangeDraft[0])}</span>
              <span>{formatYen(priceRangeDraft[1])}</span>
            </div>
          </div>
          <Separator />

          <div className="space-y-3">
            <Label>Year</Label>
            <Slider
              min={yearBounds.min}
              max={yearBounds.max}
              step={1}
              value={[yearRangeDraft[0], yearRangeDraft[1]]}
              onValueChange={(v) => {
                const next: [number, number] = [v[0], v[1]]
                yearDraftPending.current = next
                if (yearDraftRaf.current !== null) return
                yearDraftRaf.current = window.requestAnimationFrame(() => {
                  yearDraftRaf.current = null
                  setYearRangeDraft(yearDraftPending.current)
                })

                if (yearCommitTimeout.current !== null) window.clearTimeout(yearCommitTimeout.current)
                yearCommitTimeout.current = window.setTimeout(() => {
                  const [minV, maxV] = yearDraftPending.current
                  setFilters(f => ({ ...f, yearRange: [minV, maxV] }))
                  setPage(1)
                }, 250)
              }}
              onValueCommit={(v) => {
                if (yearCommitTimeout.current !== null) {
                  window.clearTimeout(yearCommitTimeout.current)
                  yearCommitTimeout.current = null
                }
                setFilters(f => ({ ...f, yearRange: [v[0], v[1]] }))
                setPage(1)
              }}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{yearRangeDraft[0]}</span>
              <span>{yearRangeDraft[1]}</span>
            </div>
          </div>
          <Separator />

          <div className="space-y-2">
            <Label>Brand</Label>
            {(brandsFromData.length ? brandsFromData : filters.brands).map((b) => (
              <div key={b} className="flex items-center gap-2">
                <Checkbox
                  id={`b-${b}`}
                  checked={filters.brands.includes(b)}
                  onCheckedChange={() => setFilters(f => ({ ...f, brands: toggle(f.brands, b) }))}
                />
                <Label htmlFor={`b-${b}`} className="font-normal cursor-pointer">{b}</Label>
              </div>
            ))}
          </div>
          <Separator />

          <div className="space-y-2">
            <Label>Body Type</Label>
            {(bodyTypesFromData.length ? bodyTypesFromData : filters.bodyTypes).map((b) => (
              <div key={b} className="flex items-center gap-2">
                <Checkbox
                  id={`bt-${b}`}
                  checked={filters.bodyTypes.includes(b)}
                  onCheckedChange={() => setFilters(f => ({ ...f, bodyTypes: toggle(f.bodyTypes, b) }))}
                />
                <Label htmlFor={`bt-${b}`} className="font-normal cursor-pointer">{b}</Label>
              </div>
            ))}
          </div>
          <Separator />

          <div className="space-y-2">
            <Label>Transmission</Label>
            {transmissionOptions.map((t) => (
              <div key={t.value} className="flex items-center gap-2">
                <Checkbox
                  id={`t-${t.value}`}
                  checked={filters.transmissions.includes(t.value)}
                  onCheckedChange={() => setFilters(f => ({ ...f, transmissions: toggle(f.transmissions, t.value) }))}
                />
                <Label htmlFor={`t-${t.value}`} className="font-normal cursor-pointer">{t.label}</Label>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden lg:block w-72 border-r shrink-0">
        <FilterPanel />
      </aside>

      <main className="flex-1 p-4 lg:p-6">
        <div className="sticky top-16 z-10 -mx-4 px-4 py-3 mb-6 bg-background/90 backdrop-blur border-b lg:-mx-6 lg:px-6">
          <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          <div className="flex gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {activeCount > 0 && (
                    <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {activeCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <SheetTitle className="sr-only">Filter Options</SheetTitle>
                <FilterPanel onClose={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            <Select value={filters.sort} onValueChange={v => setFilters(f => ({ ...f, sort: v }))}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="mileage">Lowest Mileage</SelectItem>
                <SelectItem value="year">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground mb-0">
            Showing {data?.items?.length ?? 0} of {data?.total ?? 0} vehicles
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isValidating || isLoading}
            className="shrink-0 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Failed to load cars.</p>
          </div>
        ) : isLoading && !data?.items?.length ? (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : data?.items?.length ? (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {data.items.map((car: Car) => (
              <Link key={car.id} href={`/cars/${car.id}`}>
                <Card className="group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="relative aspect-[4/3] bg-muted p-2 overflow-hidden">
                    {car.image ? (
                      <Image
                        src={car.image}
                        alt={car.brand ?? 'Car'}
                        fill
                        className="object-contain group-hover:scale-[1.03] transition-transform"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : null}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-semibold">{car.brand ?? '—'}</h3>
                      <p className="text-lg font-bold text-primary">{formatYen(car.totalPrice)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatNullableNumber(car.year)} &bull; {car.mileage == null ? '—' : `${car.mileage.toLocaleString()} km`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {car.bodyType ?? '—'} &bull; {car.color ?? '—'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No vehicles found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={resetAllFilters}
            >
              Reset filters
            </Button>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Page {data?.page ?? 1} of {data?.pages ?? 1} • Total {data?.total ?? 0}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-36 sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={isLoading || !data || data.page >= data.pages}
            >
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}


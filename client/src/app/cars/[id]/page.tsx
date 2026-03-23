'use client'

import { use, useEffect } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import type { Car } from '@/lib/types'
import { getCarById } from '@/lib/backend-api'
import { useAuth } from '@/lib/auth-context'

import { Header } from '@/components/header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { ArrowLeft } from 'lucide-react'

const featureAcronyms: Record<string, string> = {
  led: 'LED',
  awd: 'AWD',
  hud: 'HUD',
  gps: 'GPS',
  usb: 'USB',
  nfc: 'NFC',
  lte: 'LTE',
  hid: 'HID',
  dsg: 'DSG',
  mbux: 'MBUX',
  cvt: 'CVT',
  carplay: 'CarPlay',
  android: 'Android',
  xenon: 'Xenon',
  gtx: 'GTX',
}

function titleizeFeature(raw: string) {
  // Backend features are snake_case; keep human-readable strings as-is.
  if (!raw.includes('_') && !raw.includes('-')) return raw

  const parts = raw
    .replace(/-/g, '_')
    .split('_')
    .map(p => p.trim())
    .filter(Boolean)

  const titlePart = (p: string) => {
    const key = p.toLowerCase()
    return featureAcronyms[key] ?? (key.charAt(0).toUpperCase() + key.slice(1))
  }

  return parts.map(titlePart).join(' ')
}

function formatYen(val: number | null | undefined) {
  if (val === null || val === undefined) return '—'
  return `¥${Math.round(val).toLocaleString('en-US')}`
}

function formatEngine(engine_cc: number | null | undefined) {
  if (engine_cc === null || engine_cc === undefined) return '—'
  if (engine_cc === 0) return 'Electric'
  return `${engine_cc.toLocaleString()} cc`
}

function formatMileage(mileage: number | null | undefined) {
  return mileage === null || mileage === undefined ? '—' : `${mileage.toLocaleString()} km`
}

function yesNoMark(value: boolean | null | undefined) {
  if (value === null || value === undefined) return '—'
  return value ? 'Yes ✓' : 'No ✗'
}

function smokerVehicleMark(nonSmoker: boolean | null | undefined) {
  // Backend stores `non_smoker`; UI label is "Smoker vehicle".
  if (nonSmoker === null || nonSmoker === undefined) return '—'
  // non_smoker=true => smoker=false => "No"
  return nonSmoker ? 'No ✗' : 'Yes ✓'
}

export default function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  // Auth gate
  // (We keep it client-side so the API client can still redirect on 401 if needed.)
  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  const { data: car, isLoading } = useSWR<Car>(
    user ? ['car', id] : null,
    () => getCarById(id),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  if (authLoading || !user || (isLoading && !car)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6">
          <div className="h-96 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    )
  }

  if (!car) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6 text-center">
          <p>Car not found</p>
          <Link href="/">
            <Button className="mt-4">Back to listings</Button>
          </Link>
        </div>
      </div>
    )
  }

  const features = car.features

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to listings
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-muted p-2">
              {car.image ? (
                <Image
                  src={car.image}
                  alt={car.brand ?? 'Car'}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
              ) : null}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {features && features.length ? (
                  features.map((f, i) => (
                    <Badge key={i} variant="secondary">
                      {titleizeFeature(f)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-medium">{car.id ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-medium">{car.year ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mileage</p>
                  <p className="font-medium">{formatMileage(car.mileage)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transmission</p>
                  <p className="font-medium">{car.transmission ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Engine</p>
                  <p className="font-medium">{formatEngine(car.engine_cc)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Body Type</p>
                  <p className="font-medium">{car.bodyType ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Color</p>
                  <p className="font-medium">{car.color ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inspection</p>
                  <p className="font-medium">{car.inspection ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Repair History</p>
                  <p className="font-medium">{car.repairHistory ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warranty</p>
                  <p className="font-medium">{car.warranty ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maintenance</p>
                  <p className="font-medium">{car.maintenance ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New-like condition</p>
                  <p className="font-medium">{yesNoMark(car.isNewLike)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Smoker vehicle</p>
                  <p className="font-medium">{smokerVehicleMark(car.nonSmoker)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Damaged vehicle</p>
                  <p className="font-medium">{yesNoMark(car.damaged)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit sticky top-24">
            <CardHeader>
              <h1 className="text-2xl font-bold">{car.brand ?? '—'}</h1>
              <p className="text-muted-foreground">
                {car.bodyType ?? '—'} &bull; {car.year ?? '—'}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle Price</span>
                  <span>{formatYen(car.vehiclePrice)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">{formatYen(car.totalPrice)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <Button className="w-full" size="lg">Contact Seller</Button>
                <Button variant="outline" className="w-full" size="lg">Schedule Test Drive</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}


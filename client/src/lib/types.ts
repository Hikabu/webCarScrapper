export interface Car {
  id: string
  brand: string | null
  totalPrice: number | null
  vehiclePrice?: number | null
  bodyType: string | null
  color: string | null
  image: string | null
  year: number | null
  mileage: number | null
  engine_cc?: number | null
  transmission?: string | null
  inspection?: string | null
  repairHistory?: string | null
  warranty?: string | null
  maintenance?: string | null
  features?: string[] | null
  isNewLike?: boolean | null
  nonSmoker?: boolean | null
  damaged?: boolean | null
  createdAt?: string
}

export interface FilterState {
  priceRange: [number, number]
  brands: string[]
  bodyTypes: string[]
  transmissions: string[]
  yearRange: [number, number]
}

export type SortOption = 
  | 'price-asc' 
  | 'price-desc' 
  | 'mileage' 
  | 'year' 
  | 'recent'

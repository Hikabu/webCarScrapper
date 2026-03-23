import { CarList } from '@/components/car-list'
import { Header } from '@/components/header'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CarList />
    </div>
  )
}

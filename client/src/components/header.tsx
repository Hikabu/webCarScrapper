'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Car, LogOut, User } from 'lucide-react'

export function Header() {
  const { user, logout } = useAuth()
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center"><Car className="w-6 h-6 text-primary-foreground" /></div>
          <span className="font-bold text-xl">CarMarket</span>
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <span className="hidden sm:block text-sm text-muted-foreground">{user.email}</span>
              <Button variant="outline" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-2" />Logout</Button>
            </>
          ) : (
            <Link href="/login"><Button size="sm"><User className="w-4 h-4 mr-2" />Login</Button></Link>
          )}
        </nav>
      </div>
    </header>
  )
}

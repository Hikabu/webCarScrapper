'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Car, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { user, login, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => { if (user) router.push('/') }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !password) { setError('Please enter both username and password'); return }
    const ok = await login(username, password)
    if (ok) router.push('/')
    else setError('Invalid credentials')
  }

  if (user) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center"><Car className="w-7 h-7 text-primary-foreground" /></div>
          <span className="font-bold text-2xl">CarMarket</span>
        </Link>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" type="text" placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} disabled={isLoading} /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="password123" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} /></div>
              <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : 'Sign in'}</Button>
            </form>
            <div className="mt-6 p-4 bg-secondary/50 rounded-lg text-sm text-muted-foreground text-center"><strong>Demo:</strong> admin / your_password</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { signIn, getSession, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { School, Mail, Lock, Loader2, User } from 'lucide-react'
import Image from 'next/image'
import { useTenant } from '@/components/providers/tenant-provider'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { data: session, status } = useSession()
  const { tenant } = useTenant()

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      console.log('User already authenticated, redirecting...', session.user)
      if (session.user.role === 'ADMIN') {
        router.push('/dashboard')
      } else {
        router.push('/profile')
      }
    }
  }, [session, status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      console.log('Attempting sign in with:', { email })
      
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      console.log('Sign in result:', result)

      if (result?.error) {
        console.error('Sign in error:', result.error)
        setError('Invalid credentials. Please check your email/username and password.')
        return
      }

      if (result?.ok) {
        console.log('Sign in successful, getting session...')
        // Get the session to determine user role for redirection
        const sessionData = await getSession()
        console.log('Session data:', sessionData)
        
        // Role-based redirection
        if (sessionData?.user?.role === 'ADMIN') {
          console.log('Redirecting to dashboard')
          router.push('/dashboard')
        } else {
          console.log('Redirecting to profile')
          router.push('/profile')
        }
      }
    } catch (error) {
      console.error('Unexpected error during sign in:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Don't render the form if already authenticated
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--brand-primary, #4f46e5) 0%, var(--brand-secondary, #0ea5e9) 100%)`
      }}
    >
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        
        {/* Light geometric rectangles */}
        <div className="absolute -top-64 -left-96 w-[503px] h-[638px] bg-white/15 transform rotate-320 rounded"></div>
        <div className="absolute top-1/5 -right-62 w-[570px] h-[705px] bg-black/12 transform -rotate-18 rounded"></div>
        <div className="absolute -bottom-90 left-1/7 w-[537px] h-[671px] bg-white/10 transform rotate-65 rounded"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl">
          <CardHeader className="text-center pb-8 pt-8">
            <div className="flex flex-col items-center justify-center space-x-3 mb-6">
              <div className="w-24 h-24 pb-8">
                <div className="w-full h-full bg-white flex items-center justify-center">
                  <Image src="/jis-logo.png" alt="JIS AI Portal" className="w-24 h-24" width={32} height={32} />
                </div>
              </div>
                              <div>
                  <h1 className="text-2xl font-bold text-gray-900">{tenant?.display_name || 'School Portal'}</h1>
                  <h1 className="text-xl font-bold text-gray-500">Language Assessment Platform</h1>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm text-gray-600 font-medium">Username</Label>
                <div className="relative">
                  <User className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="Type your username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 border-gray-200 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] rounded-lg text-sm"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm text-gray-600 font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Type your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-12 border-gray-200 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] rounded-lg text-sm"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 rounded-lg font-medium text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, var(--brand-primary, #4f46e5) 0%, var(--brand-secondary, #0ea5e9) 100%)`
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <React.Fragment>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </React.Fragment>
                ) : (
                  'LOGIN'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

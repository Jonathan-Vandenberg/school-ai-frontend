'use client'

import React, { useState, useEffect } from 'react'
import { signIn, getSession, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {  Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { useTenant } from '@/components/providers/tenant-provider'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { data: session, status } = useSession()
  const { tenant } = useTenant()

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      console.log('User already authenticated, redirecting...', session.user)
      if (session.user.role === 'ADMIN' || session.user.role === 'TEACHER') {
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
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

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
        if (sessionData?.user?.role === 'ADMIN' || sessionData?.user?.role === 'TEACHER') {
          console.log('Redirecting to dashboard')
          router.push('/dashboard')
        } else {
          console.log('Redirecting to assignments')
          router.push('/assignments')
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
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        
        {/* Light geometric rectangles */}
        <div className="absolute -top-24 -left-16 w-[403px] h-[538px] bg-white/15 transform rotate-12 rounded animate-pulse"></div>
        <div className="absolute top-1/3 -right-32 w-[470px] h-[605px] bg-black/12 transform -rotate-18 rounded animate-pulse delay-1000"></div>
        <div className="absolute -bottom-40 left-1/4 w-[437px] h-[571px] bg-white/10 transform rotate-25 rounded animate-pulse delay-1500"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl">
          <CardHeader className="text-center pb-8 pt-8">
            <div className="flex flex-col items-center justify-center space-x-3 mb-6">
              <div className="w-24 h-24 pb-8">
                <div className="w-full h-full flex items-center justify-center">
                  <Image 
                    src={tenant?.branding?.logo_url || "/jis-logo.png"} 
                    alt={`${tenant?.display_name || 'School'} Portal`} 
                    className="w-20 h-20 object-contain" 
                    width={80} 
                    height={80} 
                  />
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
                  <Mail className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="Type your username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-black pl-12 h-12 border-gray-200 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] rounded-lg text-sm"
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
                    type={showPassword ? "text" : "password"}
                    placeholder="Type your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-black pl-12 pr-12 h-12 border-gray-200 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] rounded-lg text-sm"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-4 h-5 w-5 text-gray-400 hover:text-gray-600 focus:outline-none z-10 flex items-center justify-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    style={{ minWidth: '16px', minHeight: '16px' }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
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

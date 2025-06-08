'use client'

import React, { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { School, Mail, Lock, Loader2 } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

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
        setError('Invalid credentials. Please check your email/username and password.')
        return
      }

      if (result?.ok) {
        // Get the session to determine user role for redirection
        const sessionData = await getSession()
        
        // Role-based redirection
        if (sessionData?.user?.role === 'ADMIN') {
          router.push('/dashboard')
        } else {
          router.push('/profile')
        }
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <School className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">JIS AI Portal</h1>
          </div>
          <p className="text-gray-600">AI-powered language learning platform</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or Username</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="Enter your email or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
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
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <React.Fragment>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </React.Fragment>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">
                Demo Admin Credentials:
              </p>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Email/Username:</strong> admin@schoolai.local or admin</p>
                <p><strong>Password:</strong> admin123</p>
                <p className="text-xs text-green-600 mt-1">
                  ✨ Login now supports both email and username!
                </p>
              </div>
            </div>

            {/* Progress Tracker */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">
                🚀 Phase 2 Progress - Enhanced User Management!
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">User list with DataTable</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">✅</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Single user creation</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">✅</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Smart bulk creation</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">✅</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Username/Email login</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">✅</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Conflict resolution</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">✅</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">User edit operations</span>
                  <Badge variant="outline" className="bg-gray-50 text-gray-600">⏳</Badge>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600">
                  <strong>Latest:</strong> Simplified bulk creation - just enter names, auto-generates usernames!
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <Button variant="outline" className="w-full" asChild>
                <a href="/auth/forgot-password">
                  Forgot Password?
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Japanese International School AI Platform</p>
          <p className="mt-1">© 2024 All rights reserved</p>
        </div>
      </div>
    </div>
  )
}

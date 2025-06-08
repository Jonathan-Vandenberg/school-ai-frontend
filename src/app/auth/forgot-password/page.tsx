'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { School, ArrowLeft, Mail, Shield, RotateCcw, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <School className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">JIS AI Portal</h1>
          </div>
          <p className="text-gray-600">Reset your password</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Forgot Your Password?</CardTitle>
            <CardDescription>
              Password reset functionality is being implemented...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-800 mb-2">
                Coming Soon:
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-700">Email reset links</span>
                  </div>
                  <Badge variant="outline">📧</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-700">Secure token validation</span>
                  </div>
                  <Badge variant="outline">🔐</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-700">Password update flow</span>
                  </div>
                  <Badge variant="outline">🔄</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-700">Email confirmation</span>
                  </div>
                  <Badge variant="outline">✅</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button className="w-full" disabled>
                🔄 Password Reset Coming Soon...
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href="/auth/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
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
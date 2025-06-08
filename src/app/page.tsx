'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { School, Users, GraduationCap, BookOpen, Brain } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <School className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">JIS AI Portal</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered language learning platform for Japanese International School
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader className="text-center">
              <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <CardTitle>AI-Powered Learning</CardTitle>
              <CardDescription>
                Intelligent assessment and personalized feedback
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Tailored experiences for students, teachers, and parents
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <CardTitle>Comprehensive Platform</CardTitle>
              <CardDescription>
                Complete learning management and progress tracking
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Main CTA Card */}
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Welcome to JIS AI Portal</CardTitle>
              <CardDescription>
                Sign in to access your personalized learning dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  Available Roles:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">👨‍🎓 Student</Badge>
                  <Badge variant="outline">👨‍🏫 Teacher</Badge>
                  <Badge variant="outline">👥 Parent</Badge>
                  <Badge variant="outline">⚙️ Admin</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button size="lg" asChild>
                  <Link href="/auth/signin">
                    Access Portal
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/auth/forgot-password">
                    Forgot Password?
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Japanese International School AI Platform</p>
          <p className="mt-1">© 2024 All rights reserved</p>
        </div>
      </div>
    </div>
  )
}

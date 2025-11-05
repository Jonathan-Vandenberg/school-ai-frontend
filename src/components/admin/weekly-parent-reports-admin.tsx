'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Calendar, Mail, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface WeeklyReportsStatus {
  emailServiceAvailable: boolean
  nextRun: string
  nextRunFormatted: string
  previousWeek: {
    start: string
    end: string
    activeStudents: number
  }
  configuration: {
    smtpConfigured: boolean
    openaiConfigured: boolean
  }
}

interface WeeklyReportsResult {
  weekStart: string
  weekEnd: string
  language: string
  processed: number
  sent: number
  failed: number
  errors: string[]
}

export function WeeklyParentReportsAdmin() {
  const [status, setStatus] = useState<WeeklyReportsStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<WeeklyReportsResult | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/weekly-parent-reports?action=status')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data)
      } else {
        console.error('Failed to fetch status:', data.error)
      }
    } catch (error) {
      console.error('Error fetching status:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendReports = async (language?: string) => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/admin/weekly-parent-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_reports',
          language,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResult(data.data)
        // Refresh status after sending reports
        await fetchStatus()
      } else {
        console.error('Failed to send reports:', data.error)
        setResult({
          weekStart: '',
          weekEnd: '',
          language: language || 'both',
          processed: 0,
          sent: 0,
          failed: 1,
          errors: [data.error || 'Unknown error'],
        })
      }
    } catch (error) {
      console.error('Error sending reports:', error)
      setResult({
        weekStart: '',
        weekEnd: '',
        language: language || 'both',
        processed: 0,
        sent: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      })
    } finally {
      setLoading(false)
    }
  }

  const testEmailService = async () => {
    if (!testEmail) return
    
    setLoading(true)
    setTestEmailResult(null)
    try {
      const response = await fetch('/api/admin/weekly-parent-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_email',
          testEmail,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setTestEmailResult(data.data.message)
      } else {
        setTestEmailResult(`Error: ${data.error}`)
      }
    } catch (error) {
      setTestEmailResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testFunctionality = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/weekly-parent-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_functionality',
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(data.data.message)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Weekly Parent Reports</h2>
          <p className="text-muted-foreground">
            Manage automated weekly progress reports sent to parents
          </p>
        </div>
        <Button onClick={fetchStatus} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Status'}
        </Button>
      </div>

      {/* Status Overview */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Email Service</Label>
                <div className="flex items-center gap-2 mt-1">
                  {status.emailServiceAvailable ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={status.emailServiceAvailable ? 'default' : 'destructive'}>
                    {status.emailServiceAvailable ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Next Scheduled Run</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {status.nextRunFormatted}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Previous Week</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(status.previousWeek.start).toLocaleDateString()} - {new Date(status.previousWeek.end).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Active Students</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {status.previousWeek.activeStudents} students
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Configuration</Label>
                <div className="flex gap-2 mt-1">
                  <Badge variant={status.configuration.smtpConfigured ? 'default' : 'destructive'}>
                    SMTP
                  </Badge>
                  <Badge variant={status.configuration.openaiConfigured ? 'default' : 'destructive'}>
                    OpenAI
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Manual Actions
          </CardTitle>
          <CardDescription>
            Manually trigger reports or test the email service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Send Reports</Label>
              <div className="flex gap-2 mt-2">
                <Button 
                  onClick={() => sendReports()} 
                  disabled={loading}
                  variant="outline"
                >
                  Send Both Languages
                </Button>
                <Button 
                  onClick={() => sendReports('en')} 
                  disabled={loading}
                  variant="outline"
                >
                  English Only
                </Button>
                <Button 
                  onClick={() => sendReports('vi')} 
                  disabled={loading}
                  variant="outline"
                >
                  Vietnamese Only
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Test Email Service</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={testEmailService} 
                  disabled={loading || !testEmail}
                >
                  Send Test
                </Button>
              </div>
              {testEmailResult && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{testEmailResult}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          
          <div>
            <Button 
              onClick={testFunctionality} 
              disabled={loading}
              variant="outline"
            >
              Test Functionality
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">Week</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(result.weekStart).toLocaleDateString()} - {new Date(result.weekEnd).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Language</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.language}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Processed</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.processed} students
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Sent</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.sent} reports
                </p>
              </div>
            </div>
            
            {result.failed > 0 && (
              <div>
                <Label className="text-sm font-medium text-red-600">Failed</Label>
                <p className="text-sm text-red-600 mt-1">
                  {result.failed} reports failed
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm font-medium">Errors</Label>
                    <ul className="text-sm text-red-600 mt-1 list-disc list-inside">
                      {result.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

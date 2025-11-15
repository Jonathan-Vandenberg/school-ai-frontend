'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Info, CalendarIcon, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MultiSelect } from '@/components/ui/multi-select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function CreateFromTemplatePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get('templateId')

  const [template, setTemplate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [scheduledPublishAt, setScheduledPublishAt] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (session?.user && templateId) {
      loadTemplate()
      loadClasses()
    }
  }, [session, templateId])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${templateId}`)
      
      if (response.ok) {
        const data = await response.json()
        setTemplate(data.data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load template')
      }
    } catch (err) {
      console.error('Error loading template:', err)
      setError('Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data.data || [])
      }
    } catch (err) {
      console.error('Error loading classes:', err)
    }
  }

  const toggleClass = (classId: string) => {
    setSelectedClassIds(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedClassIds.length === 0) {
      setError('Please select at least one class')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`/api/templates/${templateId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classIds: selectedClassIds,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          scheduledPublishAt: scheduledPublishAt ? scheduledPublishAt.toISOString() : undefined,
        })
      })

      if (response.ok) {
        const data = await response.json()
        router.push('/assignments')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create assignment')
      }
    } catch (err) {
      console.error('Error creating assignment:', err)
      setError('Failed to create assignment')
    } finally {
      setSubmitting(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto p-6">
        <p>Please sign in to create assignments.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error && !template) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create Assignment from Template</h1>
        <p className="text-muted-foreground mt-1">
          Complete the assignment details using this template
        </p>
      </div>

      {/* Template Info */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium">Using template: {template.topic}</p>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
          )}
          <div className="flex gap-2 mt-2">
            {template.levels.map((level: any, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {level.levelType === 'CEFR' ? level.cefrLevel : level.gradeLevel}
              </Badge>
            ))}
          </div>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Class Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Assign to Classes</CardTitle>
            <CardDescription>
              Select which classes will receive this assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes available</p>
            ) : (
              <div className="space-y-2">
                <Label>Classes</Label>
                <MultiSelect
                  options={classes.map((c) => ({
                    label: c.name,
                    value: c.id,
                  }))}
                  selected={selectedClassIds}
                  onChange={setSelectedClassIds}
                  placeholder="Select classes"
                />
                <p className="text-xs text-muted-foreground">
                  Select one or more classes to assign this to
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule (Optional)</CardTitle>
            <CardDescription>
              Set due dates and publish schedules for this assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="space-y-2">
              <Label>Publish Date & Time</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !scheduledPublishAt && "text-muted-foreground"
                      )}
                    >
                      {scheduledPublishAt ? format(scheduledPublishAt, "PPP") : "Pick a date"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledPublishAt}
                      onSelect={(date) => {
                        if (date) {
                          const currentTime = scheduledPublishAt || new Date();
                          const newDateTime = new Date(date);
                          newDateTime.setHours(currentTime.getHours());
                          newDateTime.setMinutes(currentTime.getMinutes());
                          setScheduledPublishAt(newDateTime);
                        } else {
                          setScheduledPublishAt(undefined);
                        }
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={scheduledPublishAt ? format(scheduledPublishAt, "HH:mm") : "09:00"}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      if (timeValue) {
                        const [hours, minutes] = timeValue.split(":").map(Number);
                        const currentDate = scheduledPublishAt || new Date();
                        const newDateTime = new Date(currentDate);
                        newDateTime.setHours(hours);
                        newDateTime.setMinutes(minutes);
                        setScheduledPublishAt(newDateTime);
                      }
                    }}
                    className="w-[120px]"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to publish immediately
              </p>
            </div>

            <div className="space-y-2">
              <Label>Due Date & Time</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => {
                        if (date) {
                          const currentTime = dueDate || new Date();
                          const newDateTime = new Date(date);
                          newDateTime.setHours(currentTime.getHours());
                          newDateTime.setMinutes(currentTime.getMinutes());
                          setDueDate(newDateTime);
                        } else {
                          setDueDate(undefined);
                        }
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={dueDate ? format(dueDate, "HH:mm") : "23:59"}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      if (timeValue) {
                        const [hours, minutes] = timeValue.split(":").map(Number);
                        const currentDate = dueDate || new Date();
                        const newDateTime = new Date(currentDate);
                        newDateTime.setHours(hours);
                        newDateTime.setMinutes(minutes);
                        setDueDate(newDateTime);
                      }
                    }}
                    className="w-[120px]"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Students will see this due date and be encouraged to complete by this time.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || selectedClassIds.length === 0}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Assignment
          </Button>
        </div>
      </form>
    </div>
  )
}


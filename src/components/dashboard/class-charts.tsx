"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BookOpen, 
  Target, 
  Clock, 
  GraduationCap, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  BarChart3,
  Award,
  Brain,
  UserCheck
} from "lucide-react"

// Types for class data
interface ClassStatsData {
  classInfo: {
    id: string
    name: string
    createdAt: string
    totalUsers: number
    totalAssignments: number
  }
  currentStats: {
    totalStudents: number
    totalAssignments: number
    averageCompletion: number
    averageScore: number
    totalQuestions: number
    totalAnswers: number
    totalCorrectAnswers: number
    accuracyRate: number
    activeStudents: number
    studentsNeedingHelp: number
    lastActivityDate: string | null
    lastUpdated: string
  }
  trendData: Array<{
    date: string
    submissions: number
    correctAnswers: number
    accuracy: number
  }>
  assignmentStats: Array<{
    id: string
    topic: string
    totalQuestions: number
    completedStudents: number
    completionRate: number
    averageScore: number
  }>
  studentPerformanceData: Array<{
    name: string
    value: number
    color: string
  }>
  summary: {
    totalStudents: number
    totalAssignments: number
    averageCompletion: number
    averageScore: number
    activeStudents: number
    studentsNeedingHelp: number
    accuracyRate: number
  }
}

// Chart configurations
const areaChartConfig = {
  submissions: {
    label: "Submissions",
    color: "hsl(var(--chart-1))",
  },
  accuracy: {
    label: "Accuracy %",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const barChartConfig = {
  completionRate: {
    label: "Completion Rate",
    color: "hsl(var(--chart-1))",
  },
  averageScore: {
    label: "Average Score",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const pieChartConfig = {
  excellent: {
    label: "Excellent (90%+)",
    color: "#22c55e",
  },
  good: {
    label: "Good (70-89%)",
    color: "#3b82f6",
  },
  fair: {
    label: "Fair (50-69%)",
    color: "#f59e0b",
  },
  needsHelp: {
    label: "Needs Help (<50%)",
    color: "#ef4444",
  },
} satisfies ChartConfig

// Helper functions
const formatChange = (value: number) => {
  const abs = Math.abs(value)
  return `${value >= 0 ? '+' : ''}${abs.toFixed(1)}%`
}

const getTrendIcon = (value: number) => {
  if (value > 0) return <TrendingUp className="h-3 w-3 text-green-600" />
  if (value < 0) return <TrendingDown className="h-3 w-3 text-red-600" />
  return <Activity className="h-3 w-3 text-gray-400" />
}

// Loading skeleton component
function ChartSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

interface ClassChartsProps {
  classId: string
}

// Main class charts component
export function ClassCharts({ classId }: ClassChartsProps) {
  const [data, setData] = useState<ClassStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch class data
  useEffect(() => {
    const fetchClassData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/classes/${classId}/stats`)
        if (!response.ok) {
          throw new Error('Failed to fetch class data')
        }
        
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.error || 'Failed to load class data')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Class data fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (classId) {
      fetchClassData()
    }
  }, [classId])

  if (loading) {
    return <ChartSkeleton />
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
          <CardDescription>Unable to load class data: {error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Calculate trends (simplified since we might not have historical data)
  const avgSubmissions = data.trendData.reduce((sum, d) => sum + d.submissions, 0) / Math.max(data.trendData.length, 1)
  const avgAccuracy = data.trendData.reduce((sum, d) => sum + d.accuracy, 0) / Math.max(data.trendData.length, 1)

  return (
    <div className="space-y-6">
      {/* Class Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            {data.classInfo.name} Analytics
          </CardTitle>
          <CardDescription>
            Class created on {format(new Date(data.classInfo.createdAt), "MMM dd, yyyy")} • 
            Last updated: {data.currentStats.lastUpdated ? format(new Date(data.currentStats.lastUpdated), "MMM dd, yyyy 'at' HH:mm") : 'Never'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentStats.totalStudents}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <UserCheck className="h-3 w-3 mr-1" />
              <span>{data.currentStats.activeStudents} active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentStats.totalAssignments}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Activity className="h-3 w-3 mr-1" />
              <span>{data.currentStats.totalQuestions} total questions</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentStats.averageCompletion.toFixed(1)}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 mr-1" />
              <span>Class average</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentStats.averageScore.toFixed(1)}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Brain className="h-3 w-3 mr-1" />
              <span>{data.currentStats.accuracyRate.toFixed(1)}% accuracy</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Activity Trends */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Activity Trends</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Daily submissions and accuracy over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer config={areaChartConfig} className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  accessibilityLayer
                  data={data.trendData}
                  margin={{
                    left: 2,
                    right: 2,
                    top: 5,
                    bottom: 2,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => format(new Date(value), "MMM dd")}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    width={25}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Legend />
                  <Area
                    dataKey="submissions"
                    type="monotone"
                    fill="var(--color-submissions)"
                    fillOpacity={0.2}
                    stroke="var(--color-submissions)"
                    strokeWidth={3}
                  />
                  <Line
                    dataKey="accuracy"
                    type="monotone"
                    stroke="var(--color-accuracy)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Student Performance Distribution */}
        <Card className="md:col-span-1 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Performance Distribution</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Assignment performance levels</CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer config={pieChartConfig} className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={data.studentPerformanceData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={110}
                    strokeWidth={2}
                  >
                    {data.studentPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Assignment Performance */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Assignment Performance</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Completion rates and average scores by assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer config={barChartConfig} className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  accessibilityLayer
                  data={data.assignmentStats}
                  margin={{
                    left: 2,
                    right: 2,
                    top: 5,
                    bottom: 2,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="topic"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    width={25}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Bar 
                    dataKey="completionRate" 
                    name="Completion Rate %" 
                    fill="var(--color-completionRate)" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="averageScore" 
                    name="Average Score %" 
                    fill="var(--color-averageScore)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Class Statistics */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Detailed Class Analytics</h3>
        </div>
        
        {/* Support Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students Needing Help</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.currentStats.studentsNeedingHelp}</div>
              <p className="text-xs text-muted-foreground">
                {data.currentStats.totalStudents > 0 
                  ? `${((data.currentStats.studentsNeedingHelp / data.currentStats.totalStudents) * 100).toFixed(1)}% of class`
                  : 'No students'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Answers</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.currentStats.totalAnswers}</div>
              <p className="text-xs text-muted-foreground">
                {data.currentStats.totalCorrectAnswers} correct
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.currentStats.accuracyRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Class accuracy rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {data.currentStats.lastActivityDate 
                  ? format(new Date(data.currentStats.lastActivityDate), "MMM dd")
                  : 'No activity'
                }
              </div>
              <p className="text-xs text-muted-foreground">Most recent submission</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 
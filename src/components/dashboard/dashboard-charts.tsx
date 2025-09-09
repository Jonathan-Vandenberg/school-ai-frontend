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
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Users, BookOpen, Target, Clock, GraduationCap, Activity, CheckCircle, AlertCircle, BarChart3, Calendar, RefreshCw } from "lucide-react"

// Types for dashboard data
interface DashboardSnapshot {
  id: string
  timestamp: string
  snapshotType: string
  totalClasses: number
  totalTeachers: number
  totalStudents: number
  totalAssignments: number
  classAssignments: number
  individualAssignments: number
  averageCompletionRate: number
  averageSuccessRate: number
  studentsNeedingAttention: number
  recentActivities: number
}

interface DashboardData {
  currentMetrics: {
    totalStudents: number
    totalAssignments: number
    completedStudents: number
    inProgressStudents: number
    notStartedStudents: number
    averageCompletionRate: number
    averageScore: number
    studentsNeedingHelp: number
    totalTeachers: number
    totalClasses: number
    activeAssignments: number
    scheduledAssignments: number
    completedAssignments: number
    totalQuestionOpportunities: number
    totalAnswers: number
    totalCorrectAnswers: number
  }
  snapshots: DashboardSnapshot[]
  changes: {
    students: number
    assignments: number
    completion: number
    success: number
  }
}

// Chart configurations with vibrant colors
const areaChartConfig = {
  students: {
    label: "Students",
    color: "hsl(220, 70%, 50%)", // Vibrant blue
  },
  assignments: {
    label: "Assignments", 
    color: "hsl(142, 71%, 45%)", // Vibrant green
  },
} satisfies ChartConfig

const progressChartConfig = {
  completion: {
    label: "Completion",
    color: "hsl(262, 83%, 58%)", // Vibrant purple
  },
  success: {
    label: "Score", 
    color: "hsl(346, 77%, 49%)", // Vibrant red/pink
  },
} satisfies ChartConfig

const pieChartConfig = {
  completed: {
    label: "Completed",
    color: "hsl(142, 71%, 45%)", // Green
  },
  inProgress: {
    label: "In Progress",
    color: "hsl(45, 93%, 47%)", // Orange
  },
  notStarted: {
    label: "Not Started",
    color: "hsl(220, 70%, 50%)", // Blue
  },
} satisfies ChartConfig

const helpChartConfig = {
  help: {
    label: "Students Needing Help",
    color: "hsl(346, 77%, 49%)", // Red/pink
  },
} satisfies ChartConfig

// Utility functions
const formatPercentage = (value: number) => `${Math.round(value)}%`
  const formatChange = (value: number, suffix = "", timeframe = "from last month") => {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${Math.round(value)}${suffix} ${timeframe}`
}

const getTrendIcon = (value: number) => {
  if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
  if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
  return null
}

// Loading skeleton component
const ChartSkeleton = () => (
  <div className="space-y-3">
    <div className="space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-[200px] w-full" />
  </div>
)

// Main dashboard charts component
export function DashboardCharts() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [realAssignmentStatus, setRealAssignmentStatus] = useState<{
    completed: number;
    inProgress: number;
    notStarted: number;
  } | null>(null)

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/dashboard/graphs?type=overview')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Dashboard data fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Refresh dashboard data by clearing and recreating statistics
  const refreshDashboard = async () => {
    try {
      setRefreshing(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/refresh', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to refresh dashboard data')
      }
      
      // Re-fetch dashboard data after refresh
      const dashboardResponse = await fetch('/api/dashboard/graphs?type=overview')
      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch updated dashboard data')
      }
      
      const result = await dashboardResponse.json()
      setData(result)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh dashboard')
      console.error('Dashboard refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }

  // Calculate assignment status distribution from existing school stats
  useEffect(() => {
    if (data?.currentMetrics) {
      const { completedStudents, inProgressStudents, notStartedStudents } = data.currentMetrics
      const total = completedStudents + inProgressStudents + notStartedStudents
      
      if (total > 0) {
        setRealAssignmentStatus({
          completed: Math.round((completedStudents / total) * 100),
          inProgress: Math.round((inProgressStudents / total) * 100),
          notStarted: Math.round((notStartedStudents / total) * 100)
        })
      } else {
        // Fallback when no data exists
        setRealAssignmentStatus({
          completed: 0,
          inProgress: 0,
          notStarted: 100
        })
      }
    }
  }, [data])

  if (loading) {
    return <ChartSkeleton />
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
          <CardDescription>Unable to load dashboard data.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Safety check for trends data - the API returns snapshots array, not trends
  const snapshotsArray = Array.isArray(data.snapshots) ? data.snapshots : []
  
  // Prepare chart data with safety checks using snapshots
  const trendData = snapshotsArray.map(snapshot => ({
    date: format(new Date(snapshot.timestamp), "MMM dd"),
    students: snapshot.totalStudents || 0,
    assignments: snapshot.totalAssignments || 0,
    completion: snapshot.averageCompletionRate || 0,
    success: snapshot.averageSuccessRate || 0,
    engagement: snapshot.recentActivities || 0,
    help: snapshot.studentsNeedingAttention || 0,
  }))

  // Fallback data if no snapshots available
  if (snapshotsArray.length === 0) {
    const fallbackData = [{
      date: format(new Date(), "MMM dd"),
      students: data.currentMetrics?.totalStudents || 0,
      assignments: data.currentMetrics?.totalAssignments || 0,
      completion: data.currentMetrics?.averageCompletionRate || 0,
      success: data.currentMetrics?.averageScore || 0,
      engagement: 0, // Removed daily active students tracking
      help: data.currentMetrics?.studentsNeedingHelp || 0,
    }]
    trendData.push(...fallbackData)
  }

  // Calculate trends from snapshots data (compare with ~30 days ago or oldest available)
  const calculateTrend = (currentValue: number, snapshotField: keyof DashboardSnapshot) => {
    if (snapshotsArray.length < 2) return 0
    
    // Try to find a snapshot from ~30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    let compareSnapshot = snapshotsArray.find(snapshot => 
      new Date(snapshot.timestamp) <= thirtyDaysAgo
    )
    
    // If no snapshot from 30 days ago, use the oldest available
    if (!compareSnapshot) {
      compareSnapshot = snapshotsArray[snapshotsArray.length - 1] // Last item (oldest due to desc order)
    }
    
    const oldValue = compareSnapshot[snapshotField] as number
    return currentValue - oldValue
  }

  const studentsTrend = calculateTrend(data.currentMetrics?.totalStudents || 0, 'totalStudents')
  const assignmentsTrend = calculateTrend(data.currentMetrics?.totalAssignments || 0, 'totalAssignments')
  const completionTrend = calculateTrend(data.currentMetrics?.averageCompletionRate || 0, 'averageCompletionRate')
  const needingHelpTrend = calculateTrend(data.currentMetrics?.studentsNeedingHelp || 0, 'studentsNeedingAttention')

  // Pie chart data using real assignment status
  const completionData = realAssignmentStatus ? [
    {
      name: "Completed",
      value: realAssignmentStatus.completed,
      fill: "var(--color-completed)",
    },
    {
      name: "In Progress",
      value: realAssignmentStatus.inProgress,
      fill: "var(--color-inProgress)",
    },
    {
      name: "Not Started", 
      value: realAssignmentStatus.notStarted,
      fill: "var(--color-notStarted)",
    },
  ] : [
    {
      name: "Loading",
      value: 100,
      fill: "var(--color-notStarted)",
    }
  ]

      return (
    <div className="space-y-6">
      {/* Dashboard Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
        <Button 
          onClick={refreshDashboard}
          disabled={refreshing || loading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/dashboard/students-needing-help'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Needing Help</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentMetrics?.studentsNeedingHelp || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(needingHelpTrend)}
              <span className="ml-1">
                {formatChange(needingHelpTrend)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentMetrics?.totalStudents || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(studentsTrend)}
              <span className="ml-1">
                {formatChange(studentsTrend)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentMetrics?.totalAssignments || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(assignmentsTrend)}
              <span className="ml-1">
                {formatChange(assignmentsTrend)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(data.currentMetrics?.averageCompletionRate || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(completionTrend)}
              <span className="ml-1">
                {formatChange(completionTrend, "%")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Students & Assignments Growth */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Growth Trends</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Student enrollment and assignment creation over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer config={areaChartConfig} className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  accessibilityLayer
                  data={trendData}
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
                    dataKey="students"
                    type="monotone"
                    fill="var(--color-students)"
                    fillOpacity={0.2}
                    stroke="var(--color-students)"
                    strokeWidth={3}
                  />
                  <Area
                    dataKey="assignments"
                    type="monotone"
                    fill="var(--color-assignments)"
                    fillOpacity={0.2}
                    stroke="var(--color-assignments)"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Completion Status Pie Chart */}
        <Card className="md:col-span-1 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Assignment Status</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Current completion distribution</CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer config={pieChartConfig} className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent 
                      hideLabel 
                      formatter={(value, name) => [`${name}: ${value}%`]}
                    />}
                  />
                  <Pie
                    data={completionData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={110}
                    strokeWidth={2}
                  >
                    {completionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Progress Metrics Line Chart */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Performance Metrics</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Completion and scores over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer config={progressChartConfig} className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  accessibilityLayer
                  data={trendData}
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
                  <Legend />
                  <Line
                    dataKey="completion"
                    type="monotone"
                    stroke="var(--color-completion)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                  <Line
                    dataKey="success"
                    type="monotone"
                    stroke="var(--color-success)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Students Needing Help Area Chart */}
        <Card className="md:col-span-1 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Students Needing Help</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Students requiring attention over time</CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer config={helpChartConfig} className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  accessibilityLayer
                  data={trendData} // Show full dataset like Growth Trends
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
                    dataKey="help"
                    type="monotone"
                    fill="var(--color-help)"
                    fillOpacity={0.2}
                    stroke="var(--color-help)"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional School Statistics */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Detailed School Analytics</h3>
        </div>
        
        {/* Academic Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.currentMetrics?.totalClasses || 0}</div>
              <p className="text-xs text-muted-foreground">Active learning groups</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.currentMetrics?.totalTeachers || 0}</div>
              <p className="text-xs text-muted-foreground">Educators in system</p>
            </CardContent>
          </Card>
        </div>

        {/* Assignment Breakdown */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.currentMetrics?.activeAssignments || 0}</div>
              <p className="text-xs text-muted-foreground">Currently available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Assignments</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.currentMetrics?.scheduledAssignments || 0}</div>
              <p className="text-xs text-muted-foreground">Future releases</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Assignments</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.currentMetrics?.completedAssignments || 0}</div>
              <p className="text-xs text-muted-foreground">Fully finished</p>
            </CardContent>
          </Card>

          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scores</CardTitle>
              <Target className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.currentMetrics?.totalAnswers ? 
                  formatPercentage((data.currentMetrics.totalCorrectAnswers / data.currentMetrics.totalAnswers) * 100) : 
                  "0.0%"
                }
              </div>
              <p className="text-xs text-muted-foreground">Answer accuracy rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Q&A Analytics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Question Opportunities</CardTitle>
              <BookOpen className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.currentMetrics?.totalQuestionOpportunities || 0}</div>
              <p className="text-xs text-muted-foreground">Total possible responses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Answers</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.currentMetrics?.totalAnswers || 0}</div>
              <p className="text-xs text-muted-foreground">Student responses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Correct Answers</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.currentMetrics?.totalCorrectAnswers || 0}</div>
              <p className="text-xs text-muted-foreground">Successful responses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.currentMetrics?.totalQuestionOpportunities ? 
                  formatPercentage((data.currentMetrics.totalAnswers / data.currentMetrics.totalQuestionOpportunities) * 100) : 
                  "0.0%"
                }
              </div>
              <p className="text-xs text-muted-foreground">Student engagement rate</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 
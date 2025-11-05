import nodemailer from 'nodemailer'
import { StudentWeeklyResult, AssignmentResult, QuizResult, QuestionResult } from './student-weekly-results.service'
import { getTenantConfigForHost, TenantConfig } from '@/app/lib/tenant'

interface EmailConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private config: EmailConfig | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    const host = process.env.SMTP_HOST
    const port = process.env.SMTP_PORT
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    console.log('[EMAIL] Environment variables check:')
    console.log('  SMTP_HOST:', host ? 'Set' : 'Missing')
    console.log('  SMTP_PORT:', port ? 'Set' : 'Missing')
    console.log('  SMTP_USER:', user ? 'Set' : 'Missing')
    console.log('  SMTP_PASS:', pass ? 'Set' : 'Missing')

    if (!host || !port || !user || !pass) {
      console.warn('Email configuration incomplete. Email service will not be available.')
      console.warn('Required environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS')
      return
    }

    this.config = {
      host,
      port: parseInt(port),
      user,
      pass,
      from: process.env.SMTP_FROM || user,
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.port === 465, // true for 465, false for other ports
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
      tls: {
        rejectUnauthorized: false, // For development/testing
      },
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
    })

    console.log('Email service initialized successfully')
  }

  public isAvailable(): boolean {
    return this.transporter !== null && this.config !== null
  }

  async sendEmail(to: string, subject: string, htmlContent: string, textContent: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Email service is not configured')
    }

    try {
      await this.transporter!.sendMail({
        from: this.config!.from,
        to,
        subject,
        html: htmlContent,
        text: textContent,
      })
      console.log(`Email sent to ${to}`)
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error)
      throw error
    }
  }

  async sendTestEmail(to: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Email service is not configured')
    }

    try {
      const subject = 'School AI Test Email'
      const html = `
        <p>This is a test email from School AI.</p>
        <p>If you received this, your email service is configured correctly.</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      `
      const text = `This is a test email from School AI. If you received this, your email service is configured correctly. Generated on ${new Date().toLocaleString()}`

      await this.transporter!.sendMail({
        from: this.config!.from,
        to,
        subject,
        html,
        text,
      })
      console.log(`Test email sent to: ${to}`)
      return true
    } catch (error) {
      console.error(`Failed to send test email to ${to}:`, error)
      return false
    }
  }

  /**
   * Send weekly parent report email
   */
  async sendWeeklyParentReport(
    studentResult: StudentWeeklyResult,
    language: 'en' | 'vi' = 'en',
    host?: string
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Email service is not configured')
    }

    try {
      // Get tenant configuration
      let tenantConfig: TenantConfig | null = null
      if (host) {
        try {
          tenantConfig = await getTenantConfigForHost(host)
        } catch (error) {
          console.warn('Failed to get tenant config:', error)
        }
      }

      // Generate AI analysis first
      const aiAnalysis = await this.generateAIAnalysis(studentResult, language)
      
      const template = this.generateEnhancedWeeklyReportTemplate(studentResult, aiAnalysis, language, tenantConfig)
      
      await this.transporter!.sendMail({
        from: this.config!.from,
        to: studentResult.parentEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })

      console.log(`Weekly report sent to parent: ${studentResult.parentEmail} (${language})`)
      return true
    } catch (error) {
      console.error(`Failed to send weekly report to ${studentResult.parentEmail}:`, error)
      return false
    }
  }

  /**
   * Send weekly parent reports to multiple parents
   */
  async sendWeeklyParentReports(
    studentResults: StudentWeeklyResult[],
    language: 'en' | 'vi' = 'en'
  ): Promise<{ processed: number; sent: number; failed: number; errors: string[] }> {
    if (!this.isAvailable()) {
      throw new Error('Email service is not configured')
    }

    let processed = 0
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const studentResult of studentResults) {
      processed++
      try {
        const success = await this.sendWeeklyParentReport(studentResult, language)
        if (success) {
          sent++
        } else {
          failed++
          errors.push(`Failed to send report to ${studentResult.parentEmail} for ${studentResult.studentName}`)
        }
      } catch (error) {
        failed++
        errors.push(`Error sending report to ${studentResult.parentEmail} for ${studentResult.studentName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { processed, sent, failed, errors }
  }

  /**
   * Generate AI analysis for the student's weekly performance
   */
  private async generateAIAnalysis(studentResult: StudentWeeklyResult, language: 'en' | 'vi'): Promise<any> {
    try {
      const response = await fetch('/api/analysis/student-weekly-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentResult: studentResult,
          language: language
        }),
      })

      if (response.ok) {
        const result = await response.json()
        return result.data || this.getFallbackAnalysis(studentResult, language)
      } else {
        console.warn('AI analysis API failed, using fallback analysis')
        return this.getFallbackAnalysis(studentResult, language)
      }
    } catch (error) {
      console.warn('AI analysis failed, using fallback analysis:', error)
      return this.getFallbackAnalysis(studentResult, language)
    }
  }

  /**
   * Generate fallback analysis when AI is unavailable
   */
  private getFallbackAnalysis(studentResult: StudentWeeklyResult, language: 'en' | 'vi'): any {
    const { studentName, assignments, overallStats } = studentResult
    const completedAssignments = assignments.filter(a => a.isComplete)
    const incompleteAssignments = assignments.filter(a => !a.isComplete)
    
    if (language === 'vi') {
      let analysis = `${studentName} đã hoàn thành ${completedAssignments.length}/${assignments.length} bài tập trong tuần này. `
      
      if (overallStats.averageScore > 0) {
        analysis += `Điểm trung bình là ${overallStats.averageScore}% với tỷ lệ hoàn thành ${overallStats.completionRate}%. `
      }
      
      if (completedAssignments.length > 0) {
        analysis += `Học sinh đã thể hiện sự chăm chỉ và tiến bộ tốt. `
      }
      
      if (incompleteAssignments.length > 0) {
        analysis += `Cần hoàn thành ${incompleteAssignments.length} bài tập còn lại để đạt được mục tiêu học tập tốt nhất. `
      }
      
      analysis += `Hãy tiếp tục duy trì thói quen học tập tích cực và hoàn thành bài tập đúng hạn!`
      
      return {
        analysis,
        recommendations: ['Tiếp tục duy trì thói quen học tập tốt'],
        strengths: ['Có tiến độ học tập tích cực'],
        areasForImprovement: ['Có thể cải thiện tỷ lệ hoàn thành'],
        overallAssessment: overallStats.completionRate >= 80 ? 'good' : 'satisfactory',
        assignmentAnalyses: assignments.map(a => ({
          assignmentId: a.id,
          assignmentName: a.topic,
          analysis: `Học sinh ${a.isComplete ? 'đã hoàn thành' : 'chưa hoàn thành'} bài tập này với ${a.score || 0}% điểm số.`,
          performance: (a.score || 0) >= 80 ? 'excellent' : (a.score || 0) >= 60 ? 'good' : 'needs_improvement',
          specificFeedback: [a.isComplete ? 'Hoàn thành tốt bài tập' : 'Cần hoàn thành bài tập'],
          suggestions: [a.isComplete ? 'Tiếp tục duy trì chất lượng' : 'Cần tập trung hoàn thành']
        })),
        parentGuidance: {
          praisePoints: ['Học sinh đã thể hiện sự chăm chỉ'],
          supportAreas: ['Hỗ trợ hoàn thành bài tập đúng hạn'],
          specificActions: ['Kiểm tra tiến độ học tập hàng ngày'],
          encouragement: 'Hãy tiếp tục cố gắng và học tập chăm chỉ!'
        }
      }
    } else {
      let analysis = `${studentName} completed ${completedAssignments.length}/${assignments.length} assignments this week. `
      
      if (overallStats.averageScore > 0) {
        analysis += `The average score is ${overallStats.averageScore}% with a ${overallStats.completionRate}% completion rate. `
      }
      
      if (completedAssignments.length > 0) {
        analysis += `The student has shown dedication and good progress. `
      }
      
      if (incompleteAssignments.length > 0) {
        analysis += `There are ${incompleteAssignments.length} remaining assignments to complete for optimal learning outcomes. `
      }
      
      analysis += `Keep up the excellent work and continue completing assignments on time!`
      
      return {
        analysis,
        recommendations: ['Continue maintaining good study habits'],
        strengths: ['Shows positive learning progress'],
        areasForImprovement: ['Can improve completion rate'],
        overallAssessment: overallStats.completionRate >= 80 ? 'good' : 'satisfactory',
        assignmentAnalyses: assignments.map(a => ({
          assignmentId: a.id,
          assignmentName: a.topic,
          analysis: `Student ${a.isComplete ? 'completed' : 'has not completed'} this assignment with ${a.score || 0}% score.`,
          performance: (a.score || 0) >= 80 ? 'excellent' : (a.score || 0) >= 60 ? 'good' : 'needs_improvement',
          specificFeedback: [a.isComplete ? 'Well completed assignment' : 'Needs completion assignment'],
          suggestions: [a.isComplete ? 'Continue maintaining quality' : 'Focus on completion']
        })),
        parentGuidance: {
          praisePoints: ['Student has shown dedication'],
          supportAreas: ['Support timely assignment completion'],
          specificActions: ['Check daily learning progress'],
          encouragement: 'Keep up the great work and continue studying hard!'
        }
      }
    }
  }

  /**
   * Generate enhanced email template for weekly report
   */
  private generateEnhancedWeeklyReportTemplate(
    studentResult: StudentWeeklyResult,
    aiAnalysis: any,
    language: 'en' | 'vi',
    tenantConfig?: TenantConfig | null
  ): EmailTemplate {
    const { weekStart, weekEnd } = studentResult
    const weekRange = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
    
    if (language === 'vi') {
      return this.generateEnhancedVietnameseTemplate(studentResult, aiAnalysis, weekRange, tenantConfig)
    } else {
      // Fallback to English if Vietnamese is not explicitly requested or available
      return this.generateEnhancedEnglishTemplate(studentResult, aiAnalysis, weekRange, tenantConfig)
    }
  }

  private generateEnhancedVietnameseTemplate(studentResult: StudentWeeklyResult, aiAnalysis: any, weekRange: string, tenantConfig?: TenantConfig | null): EmailTemplate {
    const { studentName, assignments, overallStats } = studentResult
    
    const subject = `Báo Cáo Tiến Độ Hàng Tuần cho ${studentName} - ${weekRange}`
    const primaryColor = tenantConfig?.branding.primary_hex || '#667eea'

        // Generate progress chart HTML
        const progressChart = this.generateProgressChart(overallStats, 'vi', primaryColor)
    
    // Generate assignments table
    const assignmentsTable = this.generateAssignmentsTable(assignments, 'vi')

    // Generate tenant header
    const tenantHeader = this.generateTenantHeader(tenantConfig, 'vi')

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Báo Cáo Tiến Độ Hàng Tuần</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff;">
        
        ${tenantHeader}
        
        <!-- Header -->
        <div style="padding: 40px 30px; text-align: center;">
          <h1 style="color: #111111; margin: 0; font-size: 28px; font-weight: 600;">
            Báo Cáo Tiến Độ Hàng Tuần
          </h1>
          <p style="color: #111111; margin: 10px 0 0 0; font-size: 16px;">
            ${weekRange}
          </p>
          <div style="background-color: #e2e8f0; border-radius: 20px; padding: 8px 16px; display: inline-block; margin-top: 15px;">
            <span style="color: #111111; font-weight: 500;">Học sinh: ${studentName}</span>
          </div>
        </div>

        <!-- Stats Overview -->
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px; text-align: center;">Tổng Quan Hiệu Suất</h2>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background-color: #ffffff; border: 2px solid #e2e8f0; padding: 25px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px; color: #4f46e5;">${assignments.length}</div>
              <div style="font-size: 14px; color: #64748b;">Tổng Bài Tập</div>
            </div>
            <div style="background-color: #ffffff; border: 2px solid #e2e8f0; padding: 25px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px; color: #10b981;">${assignments.filter(a => a.isComplete).length}</div>
              <div style="font-size: 14px; color: #64748b;">Đã Hoàn Thành</div>
            </div>
          </div>

          <!-- Progress Chart -->
          <div style="background-color: #ffffff; padding: 30px; margin-bottom: 30px;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px;">Chỉ Số Hiệu Suất</h3>
            ${progressChart}
          </div>
        </div>

        <!-- AI Analysis -->
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px;">Phân Tích & Đánh Giá AI</h2>
          
          <!-- Overall Analysis -->
          <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); padding: 25px; border-radius: 12px; border-left: 4px solid #0ea5e9; margin-bottom: 30px;">
            <p style="margin: 0; color: #0c4a6e; font-size: 16px; line-height: 1.6;">${aiAnalysis.analysis}</p>
          </div>

          <!-- Assignment Analyses -->
          ${aiAnalysis.assignmentAnalyses && aiAnalysis.assignmentAnalyses.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px;">Phân Tích Chi Tiết Bài Tập</h3>
            ${aiAnalysis.assignmentAnalyses.map((assignment: any) => `
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${assignment.performance === 'excellent' ? '#10b981' : assignment.performance === 'good' ? '#f59e0b' : '#ef4444'};">
                <h4 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">${assignment.assignmentName}</h4>
                <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px; line-height: 1.5;">${assignment.analysis}</p>
                <div style="margin-top: 10px;">
                  <strong style="color: #1e293b; font-size: 14px;">Phản hồi cụ thể:</strong>
                  <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                    ${assignment.specificFeedback.map((feedback: string) => `<li style="color: #475569; font-size: 14px; margin-bottom: 3px;">${feedback}</li>`).join('')}
                  </ul>
                  <strong style="color: #1e293b; font-size: 14px;">Gợi ý cải thiện:</strong>
                  <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                    ${assignment.suggestions.map((suggestion: string) => `<li style="color: #475569; font-size: 14px; margin-bottom: 3px;">${suggestion}</li>`).join('')}
                  </ul>
                </div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Parent Guidance -->
          ${aiAnalysis.parentGuidance ? `
          <div style="background-color: #ffffff; padding: 25px; border-radius: 12px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Hướng Dẫn Cho Phụ Huynh</h3>
            
            ${aiAnalysis.parentGuidance.praisePoints && aiAnalysis.parentGuidance.praisePoints.length > 0 ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #92400e; font-size: 14px;">Điểm Đáng Khen Ngợi:</strong>
              <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                ${aiAnalysis.parentGuidance.praisePoints.map((point: string) => `<li style="color: #92400e; font-size: 14px; margin-bottom: 3px;">${point}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            ${aiAnalysis.parentGuidance.supportAreas && aiAnalysis.parentGuidance.supportAreas.length > 0 ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #92400e; font-size: 14px;">Lĩnh Vực Cần Hỗ Trợ:</strong>
              <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                ${aiAnalysis.parentGuidance.supportAreas.map((area: string) => `<li style="color: #92400e; font-size: 14px; margin-bottom: 3px;">${area}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            ${aiAnalysis.parentGuidance.specificActions && aiAnalysis.parentGuidance.specificActions.length > 0 ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #92400e; font-size: 14px;">Hành Động Cụ Thể:</strong>
              <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                ${aiAnalysis.parentGuidance.specificActions.map((action: string) => `<li style="color: #92400e; font-size: 14px; margin-bottom: 3px;">${action}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            ${aiAnalysis.parentGuidance.encouragement ? `
            <div style="background-color: rgba(255, 255, 255, 0.5); padding: 15px; border-radius: 8px; margin-top: 15px;">
              <p style="margin: 0; color: #92400e; font-size: 16px; font-style: italic; text-align: center;">${aiAnalysis.parentGuidance.encouragement}</p>
            </div>
            ` : ''}
          </div>
          ` : ''}
        </div>

        <!-- Assignments Section -->
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px;">Bài Tập</h2>
          ${assignmentsTable}
        </div>

        <!-- Footer -->
        <div style="background-color: ${primaryColor || '#1e293b'}; padding: 30px; text-align: center;">
          <p style="color: #94a3b8; margin: 0; font-size: 14px;">
            Báo cáo này được tự động tạo bởi School AI.<br>
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với giáo viên của con bạn.
          </p>
          <div style="margin-top: 20px;">
            <span style="color: #64748b; font-size: 12px;">Được tạo vào ${new Date().toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
    `

    const text = `
Báo Cáo Tiến Độ Hàng Tuần cho ${studentName}
${weekRange}

Tổng Quan Hiệu Suất:
- Tổng Bài Tập: ${assignments.length}
- Bài Tập Đã Hoàn Thành: ${assignments.filter(a => a.isComplete).length}
- Điểm Trung Bình: ${overallStats.averageScore}%
- Tỷ Lệ Hoàn Thành: ${overallStats.completionRate}%

Phân Tích AI:
${aiAnalysis}

Bài Tập:
${assignments.map(a => `- ${a.topic}: ${a.isComplete ? 'Hoàn thành' : 'Đang thực hiện'} (${a.score || 'N/A'}%)`).join('\n')}

Báo cáo này được tự động tạo bởi School AI.
Nếu bạn có câu hỏi, vui lòng liên hệ với giáo viên của con bạn.
    `

    return { subject, html, text }
  }

  private generateEnhancedEnglishTemplate(studentResult: StudentWeeklyResult, aiAnalysis: any, weekRange: string, tenantConfig?: TenantConfig | null): EmailTemplate {
    const { studentName, assignments, overallStats } = studentResult
    
    const subject = `Weekly Progress Report for ${studentName} - ${weekRange}`
    const primaryColor = tenantConfig?.branding.primary_hex || '#667eea'

    // Generate progress chart HTML
    const progressChart = this.generateProgressChart(overallStats, 'en', primaryColor)
    
    // Generate assignments table
    const assignmentsTable = this.generateAssignmentsTable(assignments)

    // Generate tenant header
    const tenantHeader = this.generateTenantHeader(tenantConfig, 'en')

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Progress Report</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff;">
        
        ${tenantHeader}
        
        <!-- Header -->
        <div style="padding: 40px 30px; text-align: center;">
          <h1 style="color: #111111; margin: 0; font-size: 28px; font-weight: 600;">
            Weekly Progress Report
          </h1>
          <p style="color: #111111; margin: 10px 0 0 0; font-size: 16px;">
            ${weekRange}
          </p>
          <div style="background-color: #e2e8f0; border-radius: 20px; padding: 8px 16px; display: inline-block; margin-top: 15px;">
            <span style="color: #111111; font-weight: 500;">${studentName}</span>
          </div>    
        </div>

        <!-- Stats Overview -->
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px; text-align: center;">Performance Overview</h2>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background-color: #ffffff; border: 2px solid #e2e8f0; padding: 25px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px; color: #4f46e5;">${assignments.length}</div>
              <div style="font-size: 14px; color: #64748b;">Total Assignments</div>
            </div>
            <div style="background-color: #ffffff; border: 2px solid #e2e8f0; padding: 25px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px; color: #10b981;">${assignments.filter(a => a.isComplete).length}</div>
              <div style="font-size: 14px; color: #64748b;">Completed</div>
            </div>
          </div>

          <!-- Progress Chart -->
          <div style="background-color: #ffffff; padding: 30px; margin-bottom: 30px;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px;">Performance Metrics</h3>
            ${progressChart}
          </div>
        </div>

        <!-- AI Analysis -->
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px;">AI Analysis & Insights</h2>
          
          <!-- Overall Analysis -->
          <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); padding: 25px; border-radius: 12px; border-left: 4px solid #0ea5e9; margin-bottom: 30px;">
            <p style="margin: 0; color: #0c4a6e; font-size: 16px; line-height: 1.6;">${aiAnalysis.analysis}</p>
          </div>

          <!-- Assignment Analyses -->
          ${aiAnalysis.assignmentAnalyses && aiAnalysis.assignmentAnalyses.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px;">Detailed Assignment Analysis</h3>
            ${aiAnalysis.assignmentAnalyses.map((assignment: any) => `
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${assignment.performance === 'excellent' ? '#10b981' : assignment.performance === 'good' ? '#f59e0b' : '#ef4444'};">
                <h4 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">${assignment.assignmentName}</h4>
                <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px; line-height: 1.5;">${assignment.analysis}</p>
                <div style="margin-top: 10px;">
                  <strong style="color: #1e293b; font-size: 14px;">Specific Feedback:</strong>
                  <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                    ${assignment.specificFeedback.map((feedback: string) => `<li style="color: #475569; font-size: 14px; margin-bottom: 3px;">${feedback}</li>`).join('')}
                  </ul>
                  <strong style="color: #1e293b; font-size: 14px;">Improvement Suggestions:</strong>
                  <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                    ${assignment.suggestions.map((suggestion: string) => `<li style="color: #475569; font-size: 14px; margin-bottom: 3px;">${suggestion}</li>`).join('')}
                  </ul>
                </div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Parent Guidance -->
          ${aiAnalysis.parentGuidance ? `
          <div style="background-color: #ffffff; padding: 25px; border-radius: 12px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Parent Guidance</h3>
            
            ${aiAnalysis.parentGuidance.praisePoints && aiAnalysis.parentGuidance.praisePoints.length > 0 ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #92400e; font-size: 14px;">Praise Points:</strong>
              <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                ${aiAnalysis.parentGuidance.praisePoints.map((point: string) => `<li style="color: #92400e; font-size: 14px; margin-bottom: 3px;">${point}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            ${aiAnalysis.parentGuidance.supportAreas && aiAnalysis.parentGuidance.supportAreas.length > 0 ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #92400e; font-size: 14px;">Support Areas:</strong>
              <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                ${aiAnalysis.parentGuidance.supportAreas.map((area: string) => `<li style="color: #92400e; font-size: 14px; margin-bottom: 3px;">${area}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            ${aiAnalysis.parentGuidance.specificActions && aiAnalysis.parentGuidance.specificActions.length > 0 ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #92400e; font-size: 14px;">Specific Actions:</strong>
              <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                ${aiAnalysis.parentGuidance.specificActions.map((action: string) => `<li style="color: #92400e; font-size: 14px; margin-bottom: 3px;">${action}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            ${aiAnalysis.parentGuidance.encouragement ? `
            <div style="background-color: rgba(255, 255, 255, 0.5); padding: 15px; border-radius: 8px; margin-top: 15px;">
              <p style="margin: 0; color: #92400e; font-size: 16px; font-style: italic; text-align: center;">${aiAnalysis.parentGuidance.encouragement}</p>
            </div>
            ` : ''}
          </div>
          ` : ''}
        </div>

        <!-- Assignments Section -->
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px;">Assignments</h2>
          ${assignmentsTable}
        </div>

        <!-- Footer -->
        <div style="background-color: #999999 padding: 30px; text-align: center;">
          <p style="color: #333333; margin: 0; font-size: 14px;">
            This report was automatically generated by School AI.<br>
            If you have any questions, please contact your child's teacher.
          </p>
          <div style="margin-top: 20px;">
            <span style="color: #64748b; font-size: 12px;">Generated on ${new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
    `

    const text = `
Weekly Progress Report for ${studentName}
${weekRange}

Performance Overview:
- Total Assignments: ${assignments.length}
- Completed Assignments: ${assignments.filter(a => a.isComplete).length}
- Average Score: ${overallStats.averageScore}%
- Completion Rate: ${overallStats.completionRate}%

AI Analysis:
${aiAnalysis}

Assignments:
${assignments.map(a => `- ${a.topic}: ${a.isComplete ? 'Completed' : 'In Progress'} (${a.score || 'N/A'}%)`).join('\n')}

This report was automatically generated by School AI.
If you have any questions, please contact your child's teacher.
    `

    return { subject, html, text }
  }

  /**
   * Generate tenant header with logo and school name
   */
  private generateTenantHeader(tenantConfig?: TenantConfig | null, language: 'en' | 'vi' = 'en'): string {
    if (!tenantConfig) {
      return ''
    }

    const primaryColor = tenantConfig.branding.primary_hex || '#667eea'
    const logoUrl = tenantConfig.branding.logo_url
    const schoolName = tenantConfig.display_name

    return `
      <!-- Tenant Header -->
      <div style="background-color: white; padding: 20px 30px; display: flex; align-items: center; gap: 20px;">
        ${logoUrl ? `
          <div style="flex-shrink: 0;">
            <img src="${logoUrl}" alt="${schoolName}" style="max-height: 60px; max-width: 200px; object-fit: contain;" />
          </div>
        ` : ''}
        <div style="flex: 1;">
          <h2 style="color: #111111; margin: 0; font-size: 24px; font-weight: 600;">
            ${schoolName}
          </h2>
          <p style="color: #111111; margin: 0; font-size: 16px; font-weight: 400;">
            Language Assessment Platform
          </p>
        </div>
      </div>
    `
  }

  private generateProgressChart(overallStats: StudentWeeklyResult['overallStats'], language: 'en' | 'vi' = 'en', primaryColor?: string): string {
    const scoreColor = overallStats.averageScore >= 80 ? '#10b981' : overallStats.averageScore >= 60 ? '#f59e0b' : '#ef4444'
    const completionColor = overallStats.completionRate >= 80 ? '#10b981' : overallStats.completionRate >= 60 ? '#f59e0b' : '#ef4444'

    const scoreLabel = language === 'vi' ? 'Điểm Trung Bình' : 'Average Score'
    const completionLabel = language === 'vi' ? 'Tỷ Lệ Hoàn Thành' : 'Completion Rate'

    return `
      <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 20px;">
        <!-- Average Score Chart -->
        <div style="text-align: center;">
          <div style="position: relative; width: 120px; height: 120px; margin: 0 auto 10px auto;">
            <svg viewBox="0 0 36 36" class="circular-chart" style="display: block; margin: 0 auto;">
              <path class="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#e2e8f0" stroke-width="2"></path>
              <path class="circle"
                stroke-dasharray="${overallStats.averageScore}, 100"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="${scoreColor}" stroke-width="2"></path>
              <text x="18" y="20.35" class="percentage" text-anchor="middle" fill="#1e293b" style="font-size: 8px; font-weight: bold;">${overallStats.averageScore}%</text>
            </svg>
          </div>
          <p style="margin: 0; color: #475569; font-size: 14px; font-weight: 500;">${scoreLabel}</p>
        </div>

        <!-- Completion Rate Chart -->
        <div style="text-align: center;">
          <div style="position: relative; width: 120px; height: 120px; margin: 0 auto 10px auto;">
            <svg viewBox="0 0 36 36" class="circular-chart" style="display: block; margin: 0 auto;">
              <path class="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#e2e8f0" stroke-width="2"></path>
              <path class="circle"
                stroke-dasharray="${overallStats.completionRate}, 100"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="${completionColor}" stroke-width="2"></path>
              <text x="18" y="20.35" class="percentage" text-anchor="middle" fill="#1e293b" style="font-size: 8px; font-weight: bold;">${overallStats.completionRate}%</text>
            </svg>
          </div>
          <p style="margin: 0; color: #475569; font-size: 14px; font-weight: 500;">${completionLabel}</p>
        </div>
      </div>
    `
  }

  private generateAssignmentsTable(assignments: AssignmentResult[], language: 'en' | 'vi' = 'en'): string {
    if (assignments.length === 0) {
      return `<p style="color: #64748b; text-align: center;">${language === 'vi' ? 'Không có bài tập nào trong tuần này.' : 'No assignments completed this week.'}</p>`
    }

    const headers = language === 'vi' ? ['Tên Bài Tập', 'Loại', 'Trạng Thái', 'Điểm', 'Tiến Độ'] : ['Assignment Name', 'Type', 'Status', 'Score', 'Progress']

    return `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #e2e8f0;">
            <th style="padding: 15px; text-align: left; color: #1e293b;">${headers[0]}</th>
            <th style="padding: 15px; text-align: center; color: #1e293b;">${headers[1]}</th>
            <th style="padding: 15px; text-align: center; color: #1e293b;">${headers[2]}</th>
            <th style="padding: 15px; text-align: center; color: #1e293b;">${headers[3]}</th>
            <th style="padding: 15px; text-align: center; color: #1e293b;">${headers[4]}</th>
          </tr>
        </thead>
        <tbody>
          ${assignments.map((assignment, index) => `
            <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 0 ? 'background-color: #f8fafc;' : ''}">
              <td style="padding: 15px; font-weight: 500; color: #1e293b;">${assignment.topic}</td>
              <td style="padding: 15px; text-align: center;">
                <span style="background-color: #e0f2fe; color: #0c4a6e; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${assignment.type} ${assignment.isIELTS ? '(IELTS)' : ''}
                </span>
              </td>
              <td style="padding: 15px; text-align: center;">
                <span style="background-color: ${assignment.isComplete ? '#dcfce7' : '#fef3c7'}; color: ${assignment.isComplete ? '#166534' : '#92400e'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                  ${assignment.isComplete ? (language === 'vi' ? 'Hoàn thành' : 'Completed') : (language === 'vi' ? 'Đang thực hiện' : 'In Progress')}
                </span>
              </td>
              <td style="padding: 15px; text-align: center; font-weight: 600; color: #1e293b;">
                ${assignment.score !== null && assignment.score !== undefined ? `${Math.round(assignment.score)}%` : 'N/A'}
              </td>
              <td style="padding: 15px; text-align: center;">
                <div style="font-size: 16px; color: black;">
                  ${assignment.questions.length > 0 ? `${assignment.questions.filter((q: any) => q.isComplete).length}/${assignment.questions.length}` : 'N/A'}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  }
}

// Export singleton instance
export const emailService = new EmailService()

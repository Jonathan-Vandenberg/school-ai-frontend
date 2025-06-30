const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAndyDaysIncrement() {
  try {
    console.log('🧪 Testing Andy\'s days increment logic...\n')

    // Find Andy
    const andy = await prisma.user.findFirst({
      where: { username: 'Andy' },
      select: { id: true, username: true }
    })

    if (!andy) {
      console.log('❌ Andy not found')
      return
    }

    // Get current help record
    const currentRecord = await prisma.studentsNeedingHelp.findUnique({
      where: { studentId: andy.id }
    })

    if (!currentRecord) {
      console.log('❌ No help record found for Andy')
      return
    }

    console.log('📊 Current Record:')
    console.log(`  Needs Help Since: ${currentRecord.needsHelpSince.toISOString()}`)
    console.log(`  Days Needing Help: ${currentRecord.daysNeedingHelp}`)
    console.log(`  Severity: ${currentRecord.severity}`)

    // Test 1: Set needsHelpSince to 3 days ago
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    console.log('\n🔧 Test 1: Setting needsHelpSince to 3 days ago...')
    await prisma.studentsNeedingHelp.update({
      where: { studentId: andy.id },
      data: {
        needsHelpSince: threeDaysAgo,
        daysNeedingHelp: 3,
        severity: 'RECENT'
      }
    })

    let updatedRecord = await prisma.studentsNeedingHelp.findUnique({
      where: { studentId: andy.id }
    })

    console.log(`  Updated - Needs Help Since: ${updatedRecord.needsHelpSince.toISOString()}`)
    console.log(`  Updated - Days Needing Help: ${updatedRecord.daysNeedingHelp}`)
    console.log(`  Updated - Severity: ${updatedRecord.severity}`)

    // Test 2: Set to 8 days ago (WARNING)
    const eightDaysAgo = new Date()
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

    console.log('\n🔧 Test 2: Setting needsHelpSince to 8 days ago (should be WARNING)...')
    await prisma.studentsNeedingHelp.update({
      where: { studentId: andy.id },
      data: {
        needsHelpSince: eightDaysAgo,
        daysNeedingHelp: 8,
        severity: 'WARNING'
      }
    })

    updatedRecord = await prisma.studentsNeedingHelp.findUnique({
      where: { studentId: andy.id }
    })

    console.log(`  Updated - Needs Help Since: ${updatedRecord.needsHelpSince.toISOString()}`)
    console.log(`  Updated - Days Needing Help: ${updatedRecord.daysNeedingHelp}`)
    console.log(`  Updated - Severity: ${updatedRecord.severity}`)

    // Test 3: Set to 15 days ago (CRITICAL)
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

    console.log('\n🔧 Test 3: Setting needsHelpSince to 15 days ago (should be CRITICAL)...')
    await prisma.studentsNeedingHelp.update({
      where: { studentId: andy.id },
      data: {
        needsHelpSince: fifteenDaysAgo,
        daysNeedingHelp: 15,
        severity: 'CRITICAL'
      }
    })

    updatedRecord = await prisma.studentsNeedingHelp.findUnique({
      where: { studentId: andy.id }
    })

    console.log(`  Updated - Needs Help Since: ${updatedRecord.needsHelpSince.toISOString()}`)
    console.log(`  Updated - Days Needing Help: ${updatedRecord.daysNeedingHelp}`)
    console.log(`  Updated - Severity: ${updatedRecord.severity}`)

    // Restore original values
    console.log('\n🔄 Restoring original values...')
    await prisma.studentsNeedingHelp.update({
      where: { studentId: andy.id },
      data: {
        needsHelpSince: currentRecord.needsHelpSince,
        daysNeedingHelp: currentRecord.daysNeedingHelp,
        severity: currentRecord.severity
      }
    })

    console.log('✅ Test completed - values restored')

    // Test the cron job calculation logic directly
    console.log('\n🧮 Testing calculation logic:')
    const currentDate = new Date()
    
    const testDates = [
      { days: 1, date: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000) },
      { days: 3, date: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000) },
      { days: 8, date: new Date(currentDate.getTime() - 8 * 24 * 60 * 60 * 1000) },
      { days: 15, date: new Date(currentDate.getTime() - 15 * 24 * 60 * 60 * 1000) }
    ]

    testDates.forEach(test => {
      const calculatedDays = Math.max(1, Math.ceil((currentDate.getTime() - test.date.getTime()) / (1000 * 60 * 60 * 24)))
      let expectedSeverity = 'RECENT'
      if (calculatedDays > 14) expectedSeverity = 'CRITICAL'
      else if (calculatedDays > 7) expectedSeverity = 'WARNING'
      
      console.log(`  ${test.days} days ago: Calculated ${calculatedDays} days, Severity: ${expectedSeverity}`)
    })

  } catch (error) {
    console.error('❌ Error testing Andy\'s days increment:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAndyDaysIncrement() 
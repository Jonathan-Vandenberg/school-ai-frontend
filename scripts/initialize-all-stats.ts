#!/usr/bin/env tsx

import { execSync } from 'child_process'
import * as path from 'path'

async function initializeAllStats() {
  console.log('🚀 Starting complete statistics system initialization...\n')

  const scriptsDir = path.join(__dirname)
  
  try {
    // 1. Initialize student statistics first (foundation)
    console.log('📊 Step 1: Initializing student statistics...')
    execSync('npx tsx scripts/initialize-student-stats.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    })
    console.log('✅ Student statistics completed!\n')

    // 2. Initialize class statistics (depends on student data)
    console.log('🏫 Step 2: Initializing class statistics...')
    execSync('npx tsx scripts/initialize-class-stats.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    })
    console.log('✅ Class statistics completed!\n')

    // 3. Initialize school statistics (aggregates everything)
    console.log('🌟 Step 3: Initializing school statistics...')
    execSync('npx tsx scripts/initialize-school-stats.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    })
    console.log('✅ School statistics completed!\n')

    console.log('🎉 Complete statistics system initialization finished successfully!')
    console.log('📈 Your scalable statistics system is now ready with:')
    console.log('   ✅ Student-level statistics (StudentStats table)')
    console.log('   ✅ Class-level statistics (ClassStatsDetailed table)')
    console.log('   ✅ School-wide statistics (SchoolStats table)')
    console.log('   ✅ Assignment-level statistics (AssignmentStats table)')
    console.log('\n🚀 All future assignments and progress will update statistics incrementally!')

  } catch (error) {
    console.error('❌ Error during statistics initialization:', error)
    process.exit(1)
  }
}

// Run the combined initialization
initializeAllStats().catch(console.error) 
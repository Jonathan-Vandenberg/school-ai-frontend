#!/usr/bin/env node

const { spawn } = require('child_process')

console.log('🚀 Starting School AI Platform...')

// Function to run a command with colored output
function runCommand(command, args, name, color = '\x1b[36m') {
  const childProcess = spawn(command, args, {
    stdio: 'pipe',
    shell: true,
    cwd: __dirname
  })

  const prefix = `${color}[${name}]\x1b[0m`

  childProcess.stdout.on('data', (data) => {
    data.toString().split('\n').forEach(line => {
      if (line.trim()) {
        console.log(`${prefix} ${line}`)
      }
    })
  })

  childProcess.stderr.on('data', (data) => {
    data.toString().split('\n').forEach(line => {
      if (line.trim()) {
        console.log(`${prefix} ${line}`)
      }
    })
  })

  childProcess.on('close', (code) => {
    if (code !== 0) {
      console.log(`${prefix} Process exited with code ${code}`)
    }
  })

  return childProcess
}

// Start both processes
console.log('🕐 Starting scheduled tasks...')
const cronProcess = runCommand('npx', ['tsx', 'lib/scheduled-tasks/bootstrap.ts'], 'CRON', '\x1b[33m')

console.log('🌐 Starting Next.js server...')
const nextProcess = runCommand('npm', ['run', 'dev:next'], 'NEXT', '\x1b[36m')

// Handle process termination gracefully
function shutdown() {
  console.log('\n🛑 Shutting down gracefully...')
  cronProcess.kill()
  nextProcess.kill()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Exit if either process fails
cronProcess.on('error', (error) => {
  console.error('❌ Cron process failed:', error)
})

nextProcess.on('error', (error) => {
  console.error('❌ Next.js process failed:', error)
  process.exit(1)
})

nextProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Next.js server exited with code ${code}`)
    process.exit(code)
  }
}) 
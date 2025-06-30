import { NextRequest, NextResponse } from 'next/server'
import { bootstrap } from '@/app/lib/bootstrap'

let isBootstrapped = false

export async function GET(request: NextRequest) {
  try {
    if (!isBootstrapped) {
      console.log('🔄 Initializing application for the first time...')
      await bootstrap()
      isBootstrapped = true
      console.log('✅ Application initialization completed')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Application initialized successfully',
      isBootstrapped: true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Application initialization failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initialize application',
        message: error instanceof Error ? error.message : String(error),
        isBootstrapped: false
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Force re-initializing application...')
    await bootstrap()
    isBootstrapped = true
    console.log('✅ Application re-initialization completed')

    return NextResponse.json({ 
      success: true, 
      message: 'Application re-initialized successfully',
      isBootstrapped: true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Application re-initialization failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to re-initialize application',
        message: error instanceof Error ? error.message : String(error),
        isBootstrapped: false
      },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Allowed file types and sizes
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  console.log('Upload logo API called')
  
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    console.log('Session check:', { hasSession: !!session, role: session?.user?.role })
    
    if (!session?.user) {
      console.log('No session found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      console.log('User is not admin:', session.user.role)
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Check environment variables
    const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME', 'AWS_REGION']
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars)
      return NextResponse.json(
        { error: `Missing environment variables: ${missingVars.join(', ')}` },
        { status: 500 }
      )
    }

    console.log('Environment check passed:', {
      bucket: process.env.S3_BUCKET_NAME,
      region: process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    })

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('logo') as File
    
    console.log('File received:', {
      hasFile: !!file,
      name: file?.name,
      size: file?.size,
      type: file?.type
    })
    
    if (!file) {
      console.log('No file in form data')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      console.log('Invalid file type:', file.type, 'Allowed:', ALLOWED_FILE_TYPES)
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed types: JPG, PNG, SVG, WebP` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.log('File too large:', file.size, 'Max:', MAX_FILE_SIZE)
      return NextResponse.json(
        { error: `File too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum size: 5MB` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const uniqueFileName = `logos/${randomUUID()}.${fileExtension}`

    console.log('Generated filename:', uniqueFileName)

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Buffer created, size:', buffer.length)

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: file.type,
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
      Metadata: {
        originalName: file.name,
        uploadedBy: session.user.id,
        uploadedAt: new Date().toISOString(),
      },
    })

    console.log('Starting S3 upload...')
    const uploadResult = await s3Client.send(uploadCommand)
    console.log('S3 upload successful:', uploadResult.ETag)

    // Generate S3 URL
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`

    console.log('Generated S3 URL:', s3Url)

    return NextResponse.json({
      success: true,
      url: s3Url,
      filename: uniqueFileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
    })

  } catch (error) {
    console.error('Error uploading logo to S3:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { 
        error: 'Failed to upload logo',
        details: errorMessage,
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      { status: 500 }
    )
  }
}

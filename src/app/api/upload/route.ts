import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/services/auth.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.AWS_S3_ENDPOINT, // Required for MinIO
});

export async function POST(request: NextRequest) {
  console.log('Upload API called');
  
  try {
    // Authenticate user
    console.log('Authenticating user...');
    const currentUser = await AuthService.getAuthenticatedUser();
    AuthService.requireTeacherOrAdmin(currentUser);
    console.log('User authenticated:', currentUser.username);

    console.log('Parsing form data...');
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      console.log('No file found in form data');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('File received:', { name: file.name, size: file.size, type: file.type });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename with path
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const key = `quiz-images/${timestamp}-${randomString}.${fileExtension}`;

    // Upload to S3
    console.log('Preparing S3 upload with key:', key);
    const bucketName = process.env.S3_BUCKET_NAME || '';
    console.log('Using bucket:', bucketName);
    
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: 'max-age=31536000', // 1 year cache
    });

    console.log('Uploading to S3...');
    await s3Client.send(uploadCommand);
    console.log('S3 upload successful');

    // Construct public URL
    const region = process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.AWS_S3_ENDPOINT;
    
    let publicUrl: string;
    if (endpoint) {
      // For MinIO or custom S3 endpoint
      publicUrl = `${endpoint}/${bucketName}/${key}`;
    } else {
      // For AWS S3
      publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    }

    console.log('Generated public URL:', publicUrl);

    const response = {
      success: true,
      url: publicUrl,
      key: key,
      filename: file.name,
      size: file.size,
      type: file.type,
    };

    console.log('Returning response:', response);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error uploading file:', error);

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 
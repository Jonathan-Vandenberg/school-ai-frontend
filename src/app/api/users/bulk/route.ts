import { NextRequest, NextResponse } from 'next/server'
import { AuthService, UsersService, handleServiceError } from '@/lib/services'
import { prisma } from '@/lib/db'

/**
 * Check and resolve username/email conflicts by appending sequential numbers
 */
async function resolveUserConflicts(username: string, email: string): Promise<{ username: string, email: string }> {
  let finalUsername = username
  let finalEmail = email
  let number = 0
  const maxAttempts = 100

  while (number < maxAttempts) {
    // Check if username exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: finalUsername },
          { email: finalEmail }
        ]
      }
    })

    if (!existingUser) {
      // No conflict, we can use these credentials
      break
    }

    // Conflict found, try with sequential number
    number++
    finalUsername = `${username} ${number}`
    
    // Generate safe email from the original username with number
    const safeEmailPrefix = username.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    finalEmail = `${safeEmailPrefix}${number}@school.com`
  }

  if (number >= maxAttempts) {
    throw new Error(`Could not resolve username conflict for: ${username} after ${maxAttempts} attempts`)
  }

  return { username: finalUsername, email: finalEmail }
}

/**
 * POST /api/users/bulk
 * Create multiple users at once
 * Only admins can create users in bulk
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Check admin permissions
    if (currentUser.customRole !== 'ADMIN') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Admin privileges required for bulk user creation' 
        },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { users } = body

    // Validate input
    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input: users array is required' 
        },
        { status: 400 }
      )
    }

    const results = {
      created: 0,
      failed: 0,
      errors: [] as string[],
      createdUsers: [] as any[],
      failedUsers: [] as Array<{
        name: string
        username: string
        email: string
        error: string
      }>
    }

    // Process each user
    for (let i = 0; i < users.length; i++) {
      const userData = users[i]
      
      try {
        // Validate required fields for each user
        if (!userData.username || !userData.email || !userData.password || !userData.customRole) {
          throw new Error(`Missing required fields (username, email, password, customRole)`)
        }

        // Resolve any username/email conflicts
        const { username, email } = await resolveUserConflicts(userData.username, userData.email)

        // Create user using the existing service
        const newUser = await UsersService.createUser(currentUser, {
          username,
          email,
          password: userData.password,
          customRole: userData.customRole,
          phone: userData.phone || '',
          address: userData.address || '',
          isPlayGame: userData.customRole === 'STUDENT' ? true : false,
        })

        results.created++
        results.createdUsers.push({
          name: userData.name || userData.address || newUser.username,
          username: newUser.username,
          email: newUser.email,
          role: newUser.customRole,
          id: newUser.id
        })

      } catch (error) {
        results.failed++
        const errorMessage = error instanceof Error ? error.message : `Unknown error`
        results.errors.push(errorMessage)
        results.failedUsers.push({
          name: userData.name || userData.address || userData.username || `User ${i + 1}`,
          username: userData.username || `User ${i + 1}`,
          email: userData.email || 'N/A',
          error: errorMessage
        })
        
        // Continue processing other users even if one fails
        console.error(`Bulk user creation error for user ${i + 1}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Bulk creation completed: ${results.created} created, ${results.failed} failed`,
    }, { status: 200 })

  } catch (error) {
    return handleServiceError(error)
  }
} 
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './db'
import bcrypt from 'bcryptjs'

// Define UserRole type to match schema
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    id: string
    username: string
    role: UserRole
    customImage?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      username: string
      role: UserRole
      customImage?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    username: string
    customImage?: string
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check if login is with email or username
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.email },
              { username: credentials.email } // Using email field for both email and username input
            ]
          },
          include: {
            role: true
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        if (user.blocked || !user.confirmed) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.customRole,
          customImage: user.customImage || undefined
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.username = user.username
        token.customImage = user.customImage
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
        session.user.username = token.username as string
        session.user.customImage = token.customImage as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error'
  }
}

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

// Helper function to verify passwords
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

// Role checking helper
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}

// Check if user has admin privileges
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'ADMIN'
}

// Check if user has teacher privileges
export function isTeacher(userRole: UserRole): boolean {
  return userRole === 'TEACHER' || userRole === 'ADMIN'
}

// Check if user has student privileges
export function isStudent(userRole: UserRole): boolean {
  return userRole === 'STUDENT'
}

// Check if user has parent privileges
export function isParent(userRole: UserRole): boolean {
  return userRole === 'PARENT'
} 
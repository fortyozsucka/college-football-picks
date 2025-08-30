import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from './db'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
const alg = 'HS256'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createToken(payload: { userId: string; email: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (error) {
    return null
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return null
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return null
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId as string },
      select: {
        id: true,
        email: true,
        name: true,
        totalScore: true,
        isAdmin: true,
        createdAt: true
      }
    })

    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export function setAuthCookie(token: string) {
  const cookieStore = cookies()
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

export function removeAuthCookie() {
  const cookieStore = cookies()
  cookieStore.delete('auth-token')
}
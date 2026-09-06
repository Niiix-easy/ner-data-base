import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const adminEmail = process.env.STUDIO_ADMIN_EMAIL
    const adminPassword = process.env.STUDIO_ADMIN_PASSWORD
    const sessionSecret = process.env.STUDIO_SESSION_SECRET

    if (!sessionSecret) {
      console.error('STUDIO_SESSION_SECRET is not set in environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (!adminEmail || !adminPassword) {
      console.error('STUDIO_ADMIN_EMAIL or STUDIO_ADMIN_PASSWORD is not set in environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (email === adminEmail && password === adminPassword) {
      // Secure simple token: HMAC of the string 'authenticated' with the session secret
      const token = crypto.createHmac('sha256', sessionSecret).update('authenticated').digest('hex');

      const cookieStore = await cookies()
      cookieStore.set('neer-data-base_admin_auth', token, {
        httpOnly: true,
        secure: false, // Ensure this works over local HTTP for ZimaOS
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 hours
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

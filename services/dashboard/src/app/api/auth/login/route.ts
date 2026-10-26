import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const sessionSecret = process.env.STUDIO_SESSION_SECRET

    if (!sessionSecret) {
      console.error('STUDIO_SESSION_SECRET is not set in environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Call control-plane for validation
    const authRes = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (authRes.ok) {
      const data = await authRes.json();
      
      // Secure simple token: HMAC of the string 'authenticated' with the session secret
      const token = crypto.createHmac('sha256', sessionSecret).update('authenticated').digest('hex');

      const cookieStore = cookies()
      cookieStore.set('neer-data-base_admin_auth', token, {
        httpOnly: true,
        secure: false, // Ensure this works over local HTTP for ZimaOS
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 hours
      })

      return NextResponse.json({ success: true, user: data.user })
    }

    const errorData = await authRes.json();
    return NextResponse.json({ error: errorData.error || 'Invalid email or password' }, { status: 401 })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

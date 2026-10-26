import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()
    const sessionSecret = process.env.STUDIO_SESSION_SECRET

    if (!sessionSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Call control-plane for signup
    const signupRes = await fetch('http://localhost:3001/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    if (signupRes.ok) {
      const data = await signupRes.json();
      
      // Auto login after signup
      const token = crypto.createHmac('sha256', sessionSecret).update('authenticated').digest('hex');

      const cookieStore = cookies()
      cookieStore.set('neer-data-base_admin_auth', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24
      })

      return NextResponse.json({ success: true, user: data })
    }

    const errorData = await signupRes.json();
    return NextResponse.json({ error: errorData.error || 'Signup failed' }, { status: 400 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

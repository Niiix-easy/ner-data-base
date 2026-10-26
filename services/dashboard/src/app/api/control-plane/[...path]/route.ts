import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
export async function PUT(request: Request) { return handle(request); }
export async function DELETE(request: Request) { return handle(request); }
export async function PATCH(request: Request) { return handle(request); }

async function handle(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('neer-data-base_admin_auth')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace('/api/control-plane', '');
  const targetUrl = `http://control-plane:3001${path}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('Cookie', `neer-data-base_admin_auth=${token}`);
  headers.delete('host');
  headers.delete('connection');

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COMPANY_PUBLIC = [
  '/company/login',
  '/company/register',
  '/company/forgot-password',
  '/company/reset-password',
  '/api/company/auth/',
]

const DRIVER_PUBLIC = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/') return NextResponse.next()

  if (COMPANY_PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (DRIVER_PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()

  if (pathname.startsWith('/company/') || pathname.startsWith('/api/company/')) {
    const token = request.cookies.get('company_token')?.value
    if (!token) return NextResponse.redirect(new URL('/company/login', request.url))
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

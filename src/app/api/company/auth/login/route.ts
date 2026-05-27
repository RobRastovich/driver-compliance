import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, signCompanyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await prisma.companyUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signCompanyToken({
      companyUserId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json({ ok: true })
    response.cookies.set('company_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (err) {
    console.error('Company login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

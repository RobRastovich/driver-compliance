import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const user = await prisma.companyUser.findFirst({
      where: { passwordResetToken: token },
      select: { id: true, passwordResetExpiry: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }
    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 })
    }

    await prisma.companyUser.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Company reset password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

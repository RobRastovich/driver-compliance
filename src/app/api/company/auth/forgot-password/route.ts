import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.companyUser.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, firstName: true, email: true },
    })

    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiry = new Date(Date.now() + 60 * 60 * 1000)

      await prisma.companyUser.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpiry: expiry },
      })

      await sendPasswordResetEmail(user.email, user.firstName, token, 'company')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Company forgot password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

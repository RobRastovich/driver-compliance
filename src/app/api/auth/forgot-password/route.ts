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

    const driver = await prisma.driver.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, firstName: true, email: true },
    })

    // Always return success to prevent email enumeration
    if (driver) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.driver.update({
        where: { id: driver.id },
        data: { passwordResetToken: token, passwordResetExpiry: expiry },
      })

      await sendPasswordResetEmail(driver.email, driver.firstName, token, 'driver')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

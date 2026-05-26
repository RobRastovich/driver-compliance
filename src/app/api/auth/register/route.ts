import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      email, password, firstName, lastName, phone,
      dateOfBirth, address, city, state, zip, country,
    } = body

    if (!email || !password || !firstName || !lastName || !phone || !dateOfBirth) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.driver.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const driver = await prisma.driver.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        dateOfBirth: new Date(dateOfBirth),
        address: address?.trim() ?? '',
        city: city?.trim() ?? '',
        state: state?.trim() ?? '',
        zip: zip?.trim() ?? '',
        country: country ?? 'US',
      },
    })

    const token = signToken({ driverId: driver.id, email: driver.email })
    const response = NextResponse.json({ driverId: driver.id }, { status: 201 })
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, signCompanyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      companyName, ein, companyPhone, address, city, state, zip, website,
      firstName, lastName, email, phone, password,
    } = body

    if (!companyName?.trim() || !companyPhone?.trim() || !address?.trim() ||
        !city?.trim() || !state?.trim() || !zip?.trim() ||
        !firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'All required fields must be filled in' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.companyUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const { company, user } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName.trim(),
          ein: ein?.trim() || null,
          phone: companyPhone.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          website: website?.trim() || null,
        },
      })
      const user = await tx.companyUser.create({
        data: {
          companyId: company.id,
          email: email.toLowerCase().trim(),
          passwordHash,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim() || null,
          role: 'ADMIN',
        },
      })
      return { company, user }
    })

    const token = signCompanyToken({
      companyUserId: user.id,
      companyId: company.id,
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
    console.error('Company register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

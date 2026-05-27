import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionCompanyUser, hashPassword } from '@/lib/auth'

export async function GET() {
  const session = await getSessionCompanyUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.companyUser.findMany({
    where: { companyId: session.companyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await getSessionCompanyUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const { firstName, lastName, email, phone, role, password } = await req.json()

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'First name, last name, email, and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existing = await prisma.companyUser.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })

  const user = await prisma.companyUser.create({
    data: {
      companyId: session.companyId,
      email: email.toLowerCase().trim(),
      passwordHash: await hashPassword(password),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim() || null,
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
    },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, phone: true, role: true, createdAt: true,
    },
  })

  return NextResponse.json({ user }, { status: 201 })
}

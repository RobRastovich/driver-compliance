import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionDriver } from '@/lib/auth'

export async function GET() {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      dateOfBirth: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      country: true,
      cdlNumber: true,
      cdlIssuingState: true,
      createdAt: true,
      documents: {
        select: { id: true, type: true, fileName: true, uploadedAt: true },
        orderBy: { uploadedAt: 'desc' },
      },
      verifications: {
        select: {
          overallStatus: true,
          faceMatchPassed: true,
          faceMatchScore: true,
          readingTestPassed: true,
          readingTestScore: true,
          completedAt: true,
        },
      },
    },
  })

  if (!driver) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(driver)
}

export async function PUT(req: NextRequest) {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    firstName, lastName, phone,
    address, city, state, zip,
    cdlNumber, cdlIssuingState,
  } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
  }

  const driver = await prisma.driver.update({
    where: { id: session.driverId },
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim() ?? '',
      address: address?.trim() ?? '',
      city: city?.trim() ?? '',
      state: state?.trim() ?? '',
      zip: zip?.trim() ?? '',
      cdlNumber: cdlNumber?.trim() || null,
      cdlIssuingState: cdlIssuingState?.trim() || null,
    },
    select: {
      firstName: true, lastName: true, phone: true,
      address: true, city: true, state: true, zip: true,
      cdlNumber: true, cdlIssuingState: true,
    },
  })

  return NextResponse.json(driver)
}

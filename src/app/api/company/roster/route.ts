import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionCompanyUser } from '@/lib/auth'

export async function GET() {
  const session = await getSessionCompanyUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entries = await prisma.driverRoster.findMany({
    where: { companyId: session.companyId },
    include: {
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          state: true,
          cdlNumber: true,
          cdlIssuingState: true,
          verifications: { select: { completedAt: true, overallStatus: true } },
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  })

  return NextResponse.json({ roster: entries })
}

export async function POST(req: NextRequest) {
  const session = await getSessionCompanyUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { driverId } = await req.json()
  if (!driverId) return NextResponse.json({ error: 'driverId required' }, { status: 400 })

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, verifications: { select: { overallStatus: true } } },
  })

  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
  if (driver.verifications?.overallStatus !== 'PASSED') {
    return NextResponse.json({ error: 'Only certified drivers can be added to a roster' }, { status: 422 })
  }

  const entry = await prisma.driverRoster.upsert({
    where: { companyId_driverId: { companyId: session.companyId, driverId } },
    create: { companyId: session.companyId, driverId },
    update: {},
  })

  return NextResponse.json({ entry })
}

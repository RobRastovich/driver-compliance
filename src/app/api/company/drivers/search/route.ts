import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionCompanyUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionCompanyUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const name = searchParams.get('name')?.trim() ?? ''
  const state = searchParams.get('state')?.trim() ?? ''
  const cdl = searchParams.get('cdl')?.trim() ?? ''

  if (!name && !state && !cdl) {
    return NextResponse.json({ drivers: [] })
  }

  const drivers = await prisma.driver.findMany({
    where: {
      verifications: { overallStatus: 'PASSED' },
      AND: [
        name ? {
          OR: [
            { firstName: { contains: name, mode: 'insensitive' } },
            { lastName: { contains: name, mode: 'insensitive' } },
          ],
        } : {},
        state ? {
          OR: [
            { state: { equals: state, mode: 'insensitive' } },
            { cdlIssuingState: { equals: state, mode: 'insensitive' } },
          ],
        } : {},
        cdl ? { cdlNumber: { contains: cdl, mode: 'insensitive' } } : {},
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      state: true,
      cdlNumber: true,
      cdlIssuingState: true,
      verifications: { select: { completedAt: true, overallStatus: true } },
      rosterEntries: {
        where: { companyId: session.companyId },
        select: { id: true },
      },
    },
    take: 50,
  })

  const results = drivers.map((d) => ({
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
    state: d.state,
    cdlNumber: d.cdlNumber,
    cdlIssuingState: d.cdlIssuingState,
    verifiedAt: d.verifications?.completedAt ?? null,
    onRoster: d.rosterEntries.length > 0,
  }))

  return NextResponse.json({ drivers: results })
}

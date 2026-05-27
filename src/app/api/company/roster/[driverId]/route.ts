import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionCompanyUser } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { driverId: string } }
) {
  const session = await getSessionCompanyUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.driverRoster.deleteMany({
    where: { companyId: session.companyId, driverId: params.driverId },
  })

  return NextResponse.json({ ok: true })
}

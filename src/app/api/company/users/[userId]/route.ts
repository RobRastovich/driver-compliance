import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionCompanyUser } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getSessionCompanyUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  if (params.userId === session.companyUserId) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const target = await prisma.companyUser.findUnique({
    where: { id: params.userId },
    select: { companyId: true },
  })

  if (!target || target.companyId !== session.companyId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Prevent deleting the last admin
  if (session.role === 'ADMIN') {
    const adminCount = await prisma.companyUser.count({
      where: { companyId: session.companyId, role: 'ADMIN' },
    })
    const targetIsAdmin = await prisma.companyUser.findUnique({
      where: { id: params.userId },
      select: { role: true },
    })
    if (adminCount === 1 && targetIsAdmin?.role === 'ADMIN') {
      return NextResponse.json({ error: 'Cannot delete the last admin account' }, { status: 400 })
    }
  }

  await prisma.companyUser.delete({ where: { id: params.userId } })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionDriver } from '@/lib/auth'
import { deleteObject } from '@/lib/s3'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const document = await prisma.document.findUnique({
    where: { id: params.id },
  })

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Ensure the document belongs to the authenticated driver
  if (document.driverId !== session.driverId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await deleteObject(document.s3Key)
  await prisma.document.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}

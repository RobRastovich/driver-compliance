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

  const recording = await prisma.readingRecording.findUnique({
    where: { id: params.id },
  })

  if (!recording || recording.driverId !== session.driverId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteObject(recording.s3Key)
  await prisma.readingRecording.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}

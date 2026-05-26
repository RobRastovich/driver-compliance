import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionDriver } from '@/lib/auth'
import { getPresignedDownloadUrl } from '@/lib/s3'

export async function GET(
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

  const url = await getPresignedDownloadUrl(recording.s3Key, 300)
  return NextResponse.json({ url, mimeType: recording.mimeType })
}

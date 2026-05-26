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

  const document = await prisma.document.findUnique({
    where: { id: params.id },
    select: { id: true, driverId: true, s3Key: true, mimeType: true, fileName: true },
  })

  if (!document || document.driverId !== session.driverId) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Presigned URL valid for 5 minutes
  const url = await getPresignedDownloadUrl(document.s3Key, 300)

  return NextResponse.json({ url, mimeType: document.mimeType, fileName: document.fileName })
}

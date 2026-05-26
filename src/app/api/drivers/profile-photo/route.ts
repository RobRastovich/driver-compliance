import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionDriver } from '@/lib/auth'
import { uploadProfilePhoto, getPresignedDownloadUrl } from '@/lib/s3'

export async function GET() {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { profilePhotoKey: true },
  })

  if (!driver?.profilePhotoKey) {
    return NextResponse.json({ url: null })
  }

  const url = await getPresignedDownloadUrl(driver.profilePhotoKey, 300)
  return NextResponse.json({ url })
}

export async function POST(req: NextRequest) {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const image = formData.get('image') as File | null

  if (!image) return NextResponse.json({ error: 'Image required' }, { status: 400 })
  if (image.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image too large (max 5 MB)' }, { status: 400 })

  const buffer = Buffer.from(await image.arrayBuffer())
  const s3Key = await uploadProfilePhoto(session.driverId, buffer)

  await prisma.driver.update({
    where: { id: session.driverId },
    data: { profilePhotoKey: s3Key },
  })

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionDriver } from '@/lib/auth'
import { uploadFaceCapture } from '@/lib/s3'
import { compareFaces, detectLiveFace } from '@/lib/rekognition'

export async function POST(req: NextRequest) {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const image = formData.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'Image required' }, { status: 400 })

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { profilePhotoKey: true },
  })

  if (!driver?.profilePhotoKey) {
    return NextResponse.json({ skipped: true, reason: 'no-profile-photo' }, { status: 422 })
  }

  const buffer = Buffer.from(await image.arrayBuffer())
  const captureKey = await uploadFaceCapture(session.driverId, buffer)

  const hasFace = await detectLiveFace(captureKey)
  if (!hasFace) {
    return NextResponse.json({ passed: false, score: 0, noFace: true })
  }

  const result = await compareFaces(driver.profilePhotoKey, captureKey)
  return NextResponse.json({ passed: result.matched, score: result.score })
}

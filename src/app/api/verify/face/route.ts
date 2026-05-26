import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionDriver } from '@/lib/auth'
import { uploadFaceCapture } from '@/lib/s3'
import { compareFaces, detectLiveFace } from '@/lib/rekognition'

export async function POST(req: NextRequest) {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const webcamCapture = formData.get('image') as File | null
  const documentId = formData.get('documentId') as string | null

  if (!webcamCapture) {
    return NextResponse.json({ error: 'Webcam image required' }, { status: 400 })
  }
  if (!documentId) {
    return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
  }

  // Verify the document belongs to this driver
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  })

  if (!document || document.driverId !== session.driverId) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const arrayBuffer = await webcamCapture.arrayBuffer()
  const livePhotoBuffer = Buffer.from(arrayBuffer)
  const livePhotoKey = await uploadFaceCapture(session.driverId, livePhotoBuffer)

  const hasFace = await detectLiveFace(livePhotoKey)
  if (!hasFace) {
    return NextResponse.json(
      { error: 'No face detected in webcam image. Ensure your face is clearly visible.' },
      { status: 422 }
    )
  }

  // Use saved profile photo as reference if available — higher quality than ID scans
  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { profilePhotoKey: true },
  })
  const referenceKey = driver?.profilePhotoKey ?? document.s3Key

  const result = await compareFaces(referenceKey, livePhotoKey)

  // Upsert — re-verification replaces the previous result for this document
  await prisma.documentFaceVerification.upsert({
    where: { documentId },
    update: {
      score: result.score,
      passed: result.matched,
      livePhotoKey,
      verifiedAt: new Date(),
    },
    create: {
      documentId,
      driverId: session.driverId,
      score: result.score,
      passed: result.matched,
      livePhotoKey,
    },
  })

  // Update the overall verification record based on whether ANY document passed
  const anyPassed = await prisma.documentFaceVerification.findFirst({
    where: { driverId: session.driverId, passed: true },
  })

  await prisma.verification.upsert({
    where: { driverId: session.driverId },
    update: {
      faceMatchScore: result.score,
      faceMatchPassed: !!anyPassed,
      faceMatchedAt: new Date(),
      overallStatus: anyPassed ? 'IN_PROGRESS' : 'FAILED',
    },
    create: {
      driverId: session.driverId,
      faceMatchScore: result.score,
      faceMatchPassed: !!anyPassed,
      faceMatchedAt: new Date(),
      overallStatus: anyPassed ? 'IN_PROGRESS' : 'FAILED',
    },
  })

  return NextResponse.json({
    passed: result.matched,
    score: result.score,
    documentId,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionDriver } from '@/lib/auth'
import { uploadDocument } from '@/lib/s3'
import { DocumentType } from '@prisma/client'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function POST(req: NextRequest) {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null

  if (!file || !type) {
    return NextResponse.json({ error: 'File and type are required' }, { status: 400 })
  }

  if (!Object.values(DocumentType).includes(type as DocumentType)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const s3Key = await uploadDocument(session.driverId, buffer, file.type, file.name)

  const document = await prisma.document.create({
    data: {
      driverId: session.driverId,
      type: type as DocumentType,
      s3Key,
      fileName: file.name,
      mimeType: file.type,
    },
  })

  return NextResponse.json({ id: document.id, type: document.type, fileName: document.fileName }, { status: 201 })
}

export async function GET() {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docs = await prisma.document.findMany({
    where: { driverId: session.driverId },
    select: {
      id: true,
      type: true,
      fileName: true,
      mimeType: true,
      uploadedAt: true,
      faceVerification: {
        select: { passed: true, score: true, verifiedAt: true },
      },
    },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json(docs)
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionDriver } from '@/lib/auth'
import { uploadRecording } from '@/lib/s3'

const MAX_AUDIO_SIZE = 25 * 1024 * 1024 // 25 MB
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg']

export async function POST(req: NextRequest) {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const audio = formData.get('audio') as File | null
  const sentenceIdx = parseInt(formData.get('sentenceIdx') as string ?? '', 10)
  const sentenceText = (formData.get('sentenceText') as string ?? '').trim()
  const durationSecs = parseFloat(formData.get('durationSecs') as string ?? '0') || null

  if (!audio) return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
  if (isNaN(sentenceIdx)) return NextResponse.json({ error: 'sentenceIdx required' }, { status: 400 })

  const mimeType = audio.type || 'audio/webm'
  if (!ALLOWED_AUDIO_TYPES.some((t) => mimeType.startsWith(t.split('/')[0]))) {
    return NextResponse.json({ error: 'Invalid audio type' }, { status: 400 })
  }
  if (audio.size > MAX_AUDIO_SIZE) {
    return NextResponse.json({ error: 'Recording too large (max 25 MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await audio.arrayBuffer())
  const s3Key = await uploadRecording(session.driverId, buffer, mimeType)

  const recording = await prisma.readingRecording.create({
    data: {
      driverId: session.driverId,
      sentenceIdx,
      sentenceText,
      s3Key,
      mimeType,
      durationSecs,
    },
  })

  return NextResponse.json({ id: recording.id }, { status: 201 })
}

export async function GET() {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recordings = await prisma.readingRecording.findMany({
    where: { driverId: session.driverId },
    select: {
      id: true,
      sentenceIdx: true,
      sentenceText: true,
      mimeType: true,
      durationSecs: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(recordings)
}

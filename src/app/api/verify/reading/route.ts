import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionDriver } from '@/lib/auth'
import { scoreTranscription, PASSING_SCORE } from '@/lib/reading'

export async function POST(req: NextRequest) {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const verification = await prisma.verification.findUnique({
    where: { driverId: session.driverId },
  })

  if (!verification?.faceMatchPassed) {
    return NextResponse.json(
      { error: 'Face verification must be completed first' },
      { status: 422 }
    )
  }

  const { sentenceIds, transcriptions } = await req.json() as {
    sentenceIds: string[]
    transcriptions: string[]
  }

  if (!Array.isArray(sentenceIds) || !Array.isArray(transcriptions) || sentenceIds.length !== transcriptions.length) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const sentences = await prisma.testSentence.findMany({
    where: { id: { in: sentenceIds } },
    select: { id: true, text: true },
  })

  if (sentences.length !== sentenceIds.length) {
    return NextResponse.json({ error: 'One or more sentence IDs not found' }, { status: 400 })
  }

  // Prisma returns rows in arbitrary order — reorder to match the sentenceIds the client sent
  const sentenceMap = new Map(sentences.map((s) => [s.id, s]))
  const orderedSentences = sentenceIds.map((id) => sentenceMap.get(id)!)

  // Score each sentence against the transcription at the same index
  const scores = orderedSentences.map((sentence, i) =>
    scoreTranscription(sentence.text, transcriptions[i] ?? '')
  )
  const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length
  const passed = overallScore >= PASSING_SCORE

  const expectedText = orderedSentences.map((s) => s.text).join(' | ')
  const combinedTranscription = transcriptions.join(' | ')

  await prisma.readingAttempt.create({
    data: {
      verificationId: verification.id,
      sentenceIds,
      transcription: combinedTranscription,
      expectedText,
      score: overallScore,
      passed,
    },
  })

  await prisma.verification.update({
    where: { id: verification.id },
    data: {
      readingTestPassed: passed,
      readingTestScore: overallScore,
      readingTestedAt: new Date(),
      overallStatus: passed ? 'PASSED' : 'FAILED',
      completedAt: passed ? new Date() : null,
    },
  })

  return NextResponse.json({ passed, score: overallScore, perSentenceScores: scores })
}

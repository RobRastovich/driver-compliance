import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionDriver } from '@/lib/auth'

const SENTENCE_COUNT = 4

export async function GET() {
  const session = await getSessionDriver()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Randomly select sentences
  const all = await prisma.testSentence.findMany({
    where: { active: true },
    select: { id: true, text: true },
  })

  if (all.length < SENTENCE_COUNT) {
    return NextResponse.json({ error: 'Insufficient test sentences in database' }, { status: 500 })
  }

  const shuffled = all.sort(() => Math.random() - 0.5).slice(0, SENTENCE_COUNT)
  return NextResponse.json(shuffled)
}

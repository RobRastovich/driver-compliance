import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// In Lambda/serverless environments, use a single connection with no pool timeout
// to avoid "Can't reach database" errors on cold starts
function createPrismaClient() {
  const url = process.env.DATABASE_URL
  const datasourceUrl = url && !url.includes('connection_limit')
    ? `${url}?connection_limit=1&pool_timeout=0&connect_timeout=30`
    : url

  return new PrismaClient({
    datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

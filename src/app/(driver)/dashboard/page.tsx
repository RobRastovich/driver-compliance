import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionDriver } from '@/lib/auth'
import { prisma } from '@/lib/db'
import ProfileCard from '@/components/ProfileCard'

export default async function DashboardPage() {
  const session = await getSessionDriver()
  if (!session) redirect('/login')

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    include: {
      documents: { select: { type: true }, distinct: ['type'] },
      verifications: true,
    },
  })

  if (!driver) redirect('/login')

  const hasLicense = driver.documents.some((d) => d.type === 'DRIVERS_LICENSE')
  const verification = driver.verifications
  const faceVerified = verification?.faceMatchPassed === true
  const readingPassed = verification?.readingTestPassed === true
  const overallStatus = verification?.overallStatus ?? 'PENDING'

  const steps = [
    {
      num: 1,
      title: 'Documents & Face Verification',
      desc: 'Upload your ID documents and verify your face against each one',
      done: faceVerified,
      href: '/documents',
      action: faceVerified ? 'Manage Documents' : 'Upload & Verify Documents',
    },
    {
      num: 2,
      title: 'English Reading Test',
      desc: 'Read 4 sentences aloud to verify English comprehension',
      done: readingPassed,
      locked: !faceVerified,
      href: '/reading-test',
      action: readingPassed ? 'Re-take Test' : 'Start Reading Test',
    },
  ]

  const statusColors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600',
    IN_PROGRESS: 'bg-blue-50 text-blue-700',
    PASSED: 'bg-green-50 text-green-700',
    FAILED: 'bg-red-50 text-red-700',
    EXPIRED: 'bg-yellow-50 text-yellow-700',
  }

  return (
    <div>
      <ProfileCard driver={{
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
        dateOfBirth: driver.dateOfBirth.toISOString(),
        address: driver.address,
        city: driver.city,
        state: driver.state,
        zip: driver.zip,
        cdlNumber: driver.cdlNumber ?? null,
        cdlIssuingState: driver.cdlIssuingState ?? null,
      }} />

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verification Dashboard</h1>
          <p className="text-gray-500 mt-1">Complete all three steps to receive your compliance certificate.</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusColors[overallStatus] ?? statusColors.PENDING}`}>
          {overallStatus.replace('_', ' ')}
        </span>
      </div>

      {overallStatus === 'PASSED' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">✓</div>
          <div>
            <p className="font-semibold text-green-800">Verification Complete</p>
            <p className="text-sm text-green-700">
              Completed {verification?.completedAt ? new Date(verification.completedAt).toLocaleDateString() : ''}
              {' '}— Face match score: {Math.round((verification?.faceMatchScore ?? 0))}%,
              Reading score: {Math.round(((verification?.readingTestScore ?? 0) * 100))}%
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.num}
            className={`bg-white rounded-xl border ${step.done ? 'border-green-200' : 'border-gray-200'} p-5 flex items-center gap-4`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
              ${step.done ? 'bg-green-500 text-white' : step.locked ? 'bg-gray-100 text-gray-400' : 'bg-brand-600 text-white'}`}
            >
              {step.done ? '✓' : step.num}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${step.locked ? 'text-gray-400' : 'text-gray-900'}`}>{step.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">{step.desc}</p>
            </div>
            {!step.locked && (
              <Link
                href={step.href}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${step.done
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    : 'bg-brand-600 hover:bg-brand-700 text-white'}`}
              >
                {step.action}
              </Link>
            )}
            {step.locked && (
              <span className="flex-shrink-0 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">Locked</span>
            )}
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-6 flex gap-3">
        <Link
          href="/recordings"
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span>🎙️</span> View Recordings
        </Link>
        <Link
          href="/documents"
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span>📄</span> Manage Documents
        </Link>
      </div>
    </div>
  )
}

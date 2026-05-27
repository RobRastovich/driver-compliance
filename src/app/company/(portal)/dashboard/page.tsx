import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionCompanyUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export default async function CompanyDashboardPage() {
  const session = await getSessionCompanyUser()
  if (!session) redirect('/company/login')

  const [user, rosterCount] = await Promise.all([
    prisma.companyUser.findUnique({
      where: { id: session.companyUserId },
      include: { company: true },
    }),
    prisma.driverRoster.count({ where: { companyId: session.companyId } }),
  ])

  if (!user) redirect('/company/login')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.firstName}</h1>
        <p className="text-gray-500 mt-1">{user.company.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Drivers on Roster</p>
          <p className="text-3xl font-bold text-gray-900">{rosterCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Account Type</p>
          <p className="text-lg font-semibold text-gray-900 capitalize">{user.role.toLowerCase()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Member Since</p>
          <p className="text-lg font-semibold text-gray-900">
            {user.company.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/company/search"
          className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl p-6 flex items-start gap-4 transition-colors group"
        >
          <div className="text-3xl">🔍</div>
          <div>
            <p className="font-semibold text-lg">Search Certified Drivers</p>
            <p className="text-brand-100 text-sm mt-1">Find verified drivers by name, state, or CDL number.</p>
          </div>
        </Link>
        <Link
          href="/company/roster"
          className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-6 flex items-start gap-4 transition-colors"
        >
          <div className="text-3xl">📋</div>
          <div>
            <p className="font-semibold text-lg text-gray-900">My Driver Roster</p>
            <p className="text-gray-500 text-sm mt-1">View and manage your {rosterCount} certified driver{rosterCount !== 1 ? 's' : ''}.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

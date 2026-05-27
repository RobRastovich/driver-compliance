import { redirect } from 'next/navigation'
import { getSessionCompanyUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import CompanyNavBar from '@/components/CompanyNavBar'

export default async function CompanyPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionCompanyUser()
  if (!session) redirect('/company/login')

  const user = await prisma.companyUser.findUnique({
    where: { id: session.companyUserId },
    include: { company: { select: { name: true } } },
  })

  if (!user) redirect('/company/login')

  return (
    <div className="min-h-screen flex flex-col">
      <CompanyNavBar
        companyName={user.company.name}
        userName={`${user.firstName} ${user.lastName}`}
      />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  )
}

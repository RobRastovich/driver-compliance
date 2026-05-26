import { redirect } from 'next/navigation'
import { getSessionDriver } from '@/lib/auth'
import { prisma } from '@/lib/db'
import NavBar from '@/components/NavBar'

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionDriver()
  if (!session) redirect('/login')

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { firstName: true, lastName: true },
  })

  if (!driver) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar driverName={`${driver.firstName} ${driver.lastName}`} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  )
}

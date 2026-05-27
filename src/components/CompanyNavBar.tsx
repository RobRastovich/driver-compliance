'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function CompanyNavBar({ companyName, userName }: { companyName: string; userName: string }) {
  const router = useRouter()
  const pathname = usePathname()

  async function logout() {
    await fetch('/api/company/auth/logout', { method: 'POST' })
    router.push('/company/login')
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        pathname === href ? 'text-brand-600' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/company/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-brand-600 flex items-center justify-center text-white font-bold text-sm">DC</div>
          <span className="font-semibold text-gray-800 hidden sm:block">Driver Compliance</span>
        </Link>
        <div className="flex items-center gap-4">
          {navLink('/company/dashboard', 'Dashboard')}
          {navLink('/company/search', 'Search Drivers')}
          {navLink('/company/roster', 'My Roster')}
          {navLink('/company/users', 'Users')}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <p className="text-xs font-semibold text-gray-800">{companyName}</p>
          <p className="text-xs text-gray-500">{userName}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          Sign out
        </button>
      </div>
    </nav>
  )
}

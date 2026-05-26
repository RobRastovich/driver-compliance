'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NavBar({ driverName }: { driverName: string }) {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-brand-600 flex items-center justify-center text-white font-bold text-sm">DC</div>
        <span className="font-semibold text-gray-800">Driver Compliance</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 hidden sm:block">{driverName}</span>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}

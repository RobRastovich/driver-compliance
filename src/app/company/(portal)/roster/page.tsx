'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface RosterEntry {
  id: string
  addedAt: string
  driver: {
    id: string
    firstName: string
    lastName: string
    state: string
    cdlNumber: string | null
    cdlIssuingState: string | null
    verifications: { completedAt: string | null; overallStatus: string } | null
  }
}

export default function RosterPage() {
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/company/roster')
    const data = await res.json()
    setRoster(data.roster ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(driverId: string) {
    setRemoving((s) => ({ ...s, [driverId]: true }))
    await fetch(`/api/company/roster/${driverId}`, { method: 'DELETE' })
    setRoster((r) => r.filter((e) => e.driver.id !== driverId))
    setRemoving((s) => ({ ...s, [driverId]: false }))
  }

  if (loading) {
    return <div className="text-sm text-gray-500 py-12 text-center">Loading roster…</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Driver Roster</h1>
          <p className="text-gray-500 mt-1">{roster.length} certified driver{roster.length !== 1 ? 's' : ''} on your roster</p>
        </div>
        <Link
          href="/company/search"
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + Add Drivers
        </Link>
      </div>

      {roster.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-gray-900 mb-1">Your roster is empty</p>
          <p className="text-sm text-gray-500 mb-4">Search for certified drivers and add them to your roster.</p>
          <Link href="/company/search" className="text-brand-600 hover:underline text-sm font-medium">
            Search Certified Drivers →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">State</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">CDL</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Verified</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Added</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roster.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                        {entry.driver.firstName[0]}{entry.driver.lastName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{entry.driver.firstName} {entry.driver.lastName}</p>
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">✓ Certified</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 hidden sm:table-cell">{entry.driver.state}</td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    {entry.driver.cdlNumber ? (
                      <div>
                        <p className="text-gray-900">{entry.driver.cdlNumber}</p>
                        {entry.driver.cdlIssuingState && (
                          <p className="text-xs text-gray-500">{entry.driver.cdlIssuingState}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-600 hidden md:table-cell">
                    {entry.driver.verifications?.completedAt
                      ? new Date(entry.driver.verifications.completedAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-5 py-4 text-gray-500 hidden lg:table-cell">
                    {new Date(entry.addedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => remove(entry.driver.id)}
                      disabled={removing[entry.driver.id]}
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

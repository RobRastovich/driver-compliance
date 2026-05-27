'use client'

import { useState, FormEvent } from 'react'
import { US_STATES } from '@/lib/constants'

interface DriverResult {
  id: string
  firstName: string
  lastName: string
  state: string
  cdlNumber: string | null
  cdlIssuingState: string | null
  verifiedAt: string | null
  onRoster: boolean
}

export default function SearchDriversPage() {
  const [name, setName] = useState('')
  const [state, setState] = useState('')
  const [cdl, setCdl] = useState('')
  const [results, setResults] = useState<DriverResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rosterState, setRosterState] = useState<Record<string, boolean>>({})
  const [rosterLoading, setRosterLoading] = useState<Record<string, boolean>>({})

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (name) params.set('name', name)
      if (state) params.set('state', state)
      if (cdl) params.set('cdl', cdl)
      const res = await fetch(`/api/company/drivers/search?${params}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Search failed'); return }
      setResults(data.drivers)
      const init: Record<string, boolean> = {}
      data.drivers.forEach((d: DriverResult) => { init[d.id] = d.onRoster })
      setRosterState(init)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleRoster(driverId: string, currentlyOn: boolean) {
    setRosterLoading((s) => ({ ...s, [driverId]: true }))
    try {
      if (currentlyOn) {
        await fetch(`/api/company/roster/${driverId}`, { method: 'DELETE' })
        setRosterState((s) => ({ ...s, [driverId]: false }))
      } else {
        const res = await fetch('/api/company/roster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId }),
        })
        if (res.ok) setRosterState((s) => ({ ...s, [driverId]: true }))
      }
    } finally {
      setRosterLoading((s) => ({ ...s, [driverId]: false }))
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search Certified Drivers</h1>
        <p className="text-gray-500 mt-1">Search drivers who have completed full identity and English proficiency verification.</p>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Driver Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First or last name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">All states</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">CDL Number</label>
            <input
              type="text"
              value={cdl}
              onChange={(e) => setCdl(e.target.value)}
              placeholder="CDL number"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || (!name && !state && !cdl)}
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {results !== null && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {results.length === 0 ? 'No certified drivers found matching your criteria.' : `${results.length} certified driver${results.length !== 1 ? 's' : ''} found`}
          </p>
          <div className="space-y-3">
            {results.map((driver) => {
              const onRoster = rosterState[driver.id] ?? driver.onRoster
              const busy = rosterLoading[driver.id] ?? false
              return (
                <div key={driver.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                    {driver.firstName[0]}{driver.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{driver.firstName} {driver.lastName}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                      <span>📍 {driver.state}</span>
                      {driver.cdlNumber && <span>🪪 CDL: {driver.cdlNumber}</span>}
                      {driver.cdlIssuingState && <span>Issued: {driver.cdlIssuingState}</span>}
                      {driver.verifiedAt && (
                        <span>✅ Verified {new Date(driver.verifiedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRoster(driver.id, onRoster)}
                    disabled={busy}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      onRoster
                        ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-700 border border-green-200 hover:border-red-200'
                        : 'bg-brand-600 hover:bg-brand-700 text-white'
                    }`}
                  >
                    {busy ? '…' : onRoster ? 'On Roster ✓' : 'Add to Roster'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

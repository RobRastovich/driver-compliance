'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function ResetForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Reset failed'); return }
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-red-600 font-medium">Invalid reset link.</p>
        <Link href="/forgot-password" className="text-brand-600 hover:underline text-sm">Request a new one</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 text-xl">✓</div>
        <p className="font-semibold text-gray-900">Password updated!</p>
        <p className="text-sm text-gray-500">Redirecting you to sign in…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
        <input
          type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="Min. 8 characters"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
        <input
          type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="Repeat password"
        />
      </div>
      <button
        type="submit" disabled={loading}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
      >
        {loading ? 'Saving…' : 'Set New Password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">DC</div>
          <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
          <p className="text-gray-500 mt-1">Choose a strong password for your account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <Suspense fallback={<p className="text-sm text-gray-500 text-center">Loading…</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

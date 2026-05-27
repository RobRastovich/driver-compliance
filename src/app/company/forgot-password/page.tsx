'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

export default function CompanyForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/company/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">DC</div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="text-gray-500 mt-1">Enter your company account email</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 text-xl">✓</div>
              <p className="font-semibold text-gray-900">Check your inbox</p>
              <p className="text-sm text-gray-500">If an account exists for <strong>{email}</strong>, we sent a password reset link. It expires in 1 hour.</p>
              <Link href="/company/login" className="block text-sm text-brand-600 hover:underline font-medium pt-2">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="you@company.com"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <p className="text-center text-sm text-gray-500">
                <Link href="/company/login" className="text-brand-600 hover:underline font-medium">Back to sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

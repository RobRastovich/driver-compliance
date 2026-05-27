'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { US_STATES } from '@/lib/constants'

export default function CompanyRegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    companyName: '', ein: '', companyPhone: '',
    address: '', city: '', state: '', zip: '', website: '',
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '',
  })

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/company/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Registration failed'); return }
      router.push('/company/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'

  const field = (label: string, key: keyof typeof form, type = 'text', required = true, placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{!required && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
      </label>
      <input type={type} required={required} value={form[key]} onChange={set(key)} placeholder={placeholder} className={inputCls} />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">DC</div>
          <h1 className="text-2xl font-bold text-gray-900">Register Your Company</h1>
          <p className="text-gray-500 mt-1">Create an account to search and manage certified drivers</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

          {/* Company Info */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pb-3 border-b border-gray-100 mb-4">Company Information</h2>
            <div className="space-y-4">
              {field('Company Name', 'companyName', 'text', true, 'Acme Freight LLC')}
              <div className="grid grid-cols-2 gap-4">
                {field('EIN', 'ein', 'text', false, 'XX-XXXXXXX')}
                {field('Company Phone', 'companyPhone', 'tel', true, '(555) 000-0000')}
              </div>
              {field('Street Address', 'address', 'text', true, '123 Main St')}
              <div className="grid grid-cols-3 gap-4">
                {field('City', 'city')}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                  <select required value={form.state} onChange={set('state')} className={inputCls + ' bg-white'}>
                    <option value="">Select…</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {field('ZIP', 'zip', 'text', true, '12345')}
              </div>
              {field('Website', 'website', 'url', false, 'https://yourcompany.com')}
            </div>
          </div>

          {/* Admin Account */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pb-3 border-b border-gray-100 mb-4">Administrator Account</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field('First Name', 'firstName')}
                {field('Last Name', 'lastName')}
              </div>
              {field('Email Address', 'email', 'email', true, 'you@company.com')}
              {field('Phone', 'phone', 'tel', false, '(555) 000-0000')}
              <div className="grid grid-cols-2 gap-4">
                {field('Password', 'password', 'password', true, 'Min. 8 characters')}
                {field('Confirm Password', 'confirmPassword', 'password', true, 'Repeat password')}
              </div>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Creating account…' : 'Create Company Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/company/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

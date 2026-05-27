'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'

interface CompanyUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: 'ADMIN' | 'USER'
  createdAt: string
}

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', role: 'USER' as 'ADMIN' | 'USER',
  password: '', confirmPassword: '',
}

export default function UsersPage() {
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/company/users')
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openModal() {
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/company/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Failed to create user'); return }
      setUsers((u) => [...u, data.user])
      setShowModal(false)
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('Remove this user from your company?')) return
    setDeleting((d) => ({ ...d, [userId]: true }))
    const res = await fetch(`/api/company/users/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers((u) => u.filter((user) => user.id !== userId))
    } else {
      const data = await res.json()
      alert(data.error ?? 'Could not delete user')
    }
    setDeleting((d) => ({ ...d, [userId]: false }))
  }

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage who has access to your company account</p>
        </div>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + Add User
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-12 text-center">Loading users…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs flex-shrink-0">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 hidden sm:table-cell">{user.email}</td>
                  <td className="px-5 py-4 text-gray-600 hidden md:table-cell">{user.phone ?? '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      user.role === 'ADMIN'
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role === 'ADMIN' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 hidden lg:table-cell">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleDelete(user.id)}
                      disabled={deleting[user.id]}
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

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add New User</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{formError}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                  <input type="text" required value={form.firstName} onChange={set('firstName')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <input type="text" required value={form.lastName} onChange={set('lastName')} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input type="email" required value={form.email} onChange={set('email')} className={inputCls} placeholder="user@company.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="tel" value={form.phone} onChange={set('phone')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <select value={form.role} onChange={set('role')} className={inputCls + ' bg-white'}>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input type="password" required minLength={8} value={form.password} onChange={set('password')} className={inputCls} placeholder="Min. 8 chars" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <input type="password" required value={form.confirmPassword} onChange={set('confirmPassword')} className={inputCls} />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
                >
                  {saving ? 'Creating…' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg py-2.5 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

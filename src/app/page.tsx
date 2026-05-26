import { redirect } from 'next/navigation'
import { getSessionDriver } from '@/lib/auth'

export default async function Home() {
  const session = await getSessionDriver()
  if (session) redirect('/dashboard')
  redirect('/login')
}

import { getCurrentProfile } from '@/lib/repositories/profiles'
import { redirect } from 'next/navigation'
import { getPostDiscipleshipCases } from '@/lib/actions/post-discipleship'
import { getDepartments } from '@/lib/repositories/departments'
import { PosDiscipuladoClient } from './client'

export default async function PosDiscipuladoPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')
  if (profile.role === 'DISCIPULADOR') redirect('/painel')

  const [result, departments] = await Promise.all([
    getPostDiscipleshipCases(profile.congregation_id),
    getDepartments(profile.congregation_id, { activeOnly: true }),
  ])
  const cases = result.data ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PosDiscipuladoClient cases={cases as any} departments={departments} currentProfile={profile} />
    </div>
  )
}

import { getCurrentProfile } from '@/lib/repositories/profiles'
import { redirect } from 'next/navigation'
import { getPostDiscipleshipCases } from '@/lib/actions/post-discipleship'
import { PosDiscipuladoClient } from './client'

export default async function PosDiscipuladoPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const result = await getPostDiscipleshipCases(profile.congregation_id)
  const cases = result.data ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PosDiscipuladoClient cases={cases as any} currentProfile={profile} />
    </div>
  )
}

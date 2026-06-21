import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getCases } from '@/lib/repositories/cases'
import { getProfilesByCongrегation } from '@/lib/repositories/profiles'
import { redirect } from 'next/navigation'
import { AcolhimentoClient } from './client'

export default async function AcolhimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; filter?: string; search?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const { status, filter, search } = await searchParams

  const [cases, discipuladores] = await Promise.all([
    getCases(profile.congregation_id, { search }),
    getProfilesByCongrегation(profile.congregation_id),
  ])

  const discipuladoresAtivos = discipuladores.filter(
    p => ['DISCIPULADOR', 'ADMIN_DISCIPULADO', 'SM_DISCIPULADO'].includes(p.role) && p.is_active
  )

  return (
    <div className="p-6">
      <AcolhimentoClient
        cases={cases}
        discipuladores={discipuladoresAtivos}
        congregationId={profile.congregation_id}
        currentUserId={profile.id}
        currentRole={profile.role}
        initialStatus={status}
        initialFilter={filter}
        initialSearch={search}
      />
    </div>
  )
}

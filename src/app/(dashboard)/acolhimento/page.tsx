import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getCases } from '@/lib/repositories/cases'
import { getProfilesByCongregation } from '@/lib/repositories/profiles'
import { getDisciplesLite } from '@/lib/repositories/disciples'
import { redirect } from 'next/navigation'
import { AcolhimentoClient } from './client'

export default async function AcolhimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; filter?: string; search?: string; discipulador?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const { status, filter, search, discipulador } = await searchParams

  const [cases, discipuladores, disciples] = await Promise.all([
    getCases(profile.congregation_id, { search }),
    getProfilesByCongregation(profile.congregation_id),
    getDisciplesLite(profile.congregation_id),
  ])

  const discipuladoresAtivos = discipuladores.filter(
    p => ['DISCIPULADOR', 'ADMIN_DISCIPULADO', 'SM_DISCIPULADO'].includes(p.role) && p.is_active
  )

  // Discipulandos sem case ativo para o modal de iniciar acolhimento
  const casedDiscipleIds = new Set(cases.map(c => c.disciple_id))
  const disciplesSemCase = disciples.filter(d => !casedDiscipleIds.has(d.id))

  return (
    <div className="p-4 md:p-6">
      <AcolhimentoClient
        cases={cases}
        discipuladores={discipuladoresAtivos}
        disciplesSemCase={disciplesSemCase}
        congregationId={profile.congregation_id}
        currentUserId={profile.id}
        currentRole={profile.role}
        initialStatus={status}
        initialFilter={filter}
        initialSearch={search}
        initialDiscipulador={discipulador}
      />
    </div>
  )
}

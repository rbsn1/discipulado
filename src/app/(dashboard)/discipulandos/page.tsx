import { getCurrentProfile, getProfilesByCongregation } from '@/lib/repositories/profiles'
import { getDisciples } from '@/lib/repositories/disciples'
import { getWorshipServices } from '@/lib/repositories/worship-services'
import { getClasses } from '@/lib/repositories/classes'
import { redirect } from 'next/navigation'
import { DisciplesClientPage } from './client'
import type { CaseStatus } from '@/types'

export default async function DiscipulandosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; turma?: string; responsavel?: string; culto?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const { search, status, turma, responsavel, culto } = await searchParams
  const [disciples, worshipServices, classes, profiles] = await Promise.all([
    getDisciples(profile.congregation_id, {
      search,
      status: status as CaseStatus | 'SEM_CASE' | undefined,
      classId: turma,
      assignedTo: responsavel,
      worshipServiceId: culto,
    }),
    getWorshipServices(profile.congregation_id, { activeOnly: true }),
    getClasses(profile.congregation_id, { activeOnly: true }),
    getProfilesByCongregation(profile.congregation_id),
  ])

  const discipuladores = profiles.filter(
    p => ['DISCIPULADOR', 'ADMIN_DISCIPULADO', 'SM_DISCIPULADO'].includes(p.role) && p.is_active
  )

  // Acolhedor só vê as vidas acolhidas atribuídas a ele + as que ainda não
  // têm responsável (mesma regra de /acolhimento) — SM/Admin continuam
  // vendo todo mundo.
  const visibleDisciples = profile.role === 'DISCIPULADOR'
    ? disciples.filter(d => {
        const assignedTo = d.discipleship_cases?.[0]?.assigned_to
        return !assignedTo || assignedTo === profile.id
      })
    : disciples

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <DisciplesClientPage
        disciples={visibleDisciples}
        congregationId={profile.congregation_id}
        currentUserId={profile.id}
        currentRole={profile.role}
        search={search}
        status={status}
        turma={turma}
        responsavel={responsavel}
        culto={culto}
        worshipServices={worshipServices}
        classes={classes}
        discipuladores={discipuladores}
      />
    </div>
  )
}

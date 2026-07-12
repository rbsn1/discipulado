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
  searchParams: Promise<{ search?: string; status?: string; turma?: string; responsavel?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const { search, status, turma, responsavel } = await searchParams
  const [disciples, worshipServices, classes, profiles] = await Promise.all([
    getDisciples(profile.congregation_id, {
      search,
      status: status as CaseStatus | 'SEM_CASE' | undefined,
      classId: turma,
      assignedTo: responsavel,
    }),
    getWorshipServices(profile.congregation_id, { activeOnly: true }),
    getClasses(profile.congregation_id, { activeOnly: true }),
    getProfilesByCongregation(profile.congregation_id),
  ])

  const discipuladores = profiles.filter(
    p => ['DISCIPULADOR', 'ADMIN_DISCIPULADO', 'SM_DISCIPULADO'].includes(p.role) && p.is_active
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <DisciplesClientPage
        disciples={disciples}
        congregationId={profile.congregation_id}
        currentUserId={profile.id}
        search={search}
        status={status}
        turma={turma}
        responsavel={responsavel}
        worshipServices={worshipServices}
        classes={classes}
        discipuladores={discipuladores}
      />
    </div>
  )
}

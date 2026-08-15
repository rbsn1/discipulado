import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getClassById, getAbsencesByClass } from '@/lib/repositories/classes'
import { getModuleTemplates } from '@/lib/repositories/modules'
import { getCases, getPreferredShiftByCaseId } from '@/lib/repositories/cases'
import { redirect, notFound } from 'next/navigation'
import { TurmaDetailClient } from './client'

export default async function TurmaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')
  if (profile.role === 'DISCIPULADOR') redirect('/painel')

  const { id } = await params
  const [turma, modules, pendingCases, shiftByCase, absences] = await Promise.all([
    getClassById(id).catch(() => null),
    getModuleTemplates(profile.congregation_id, { activeOnly: true }),
    getCases(profile.congregation_id, { status: ['PENDENTE_MATRICULA'] }),
    getPreferredShiftByCaseId(profile.congregation_id),
    getAbsencesByClass(id),
  ])
  if (!turma) notFound()

  // Só quem confirmou presença numa Festa de Boas-vindas com o MESMO turno
  // desta turma entra na fila de "Adicionar participante" — mesma ideia da
  // FBV: aparece pra todas as turmas do turno até ser matriculado em uma,
  // aí some das outras (porque sai de PENDENTE_MATRICULA).
  const turmaShiftId = (turma as { shift_id: string | null }).shift_id
  const eligibleCases = pendingCases.filter(c => (shiftByCase.get(c.id) ?? null) === turmaShiftId)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <TurmaDetailClient
        turma={turma as any}
        modules={modules}
        eligibleCases={eligibleCases}
        absences={absences}
        currentProfile={profile}
      />
    </div>
  )
}

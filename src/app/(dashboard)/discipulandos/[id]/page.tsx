import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getDiscipleById } from '@/lib/repositories/disciples'
import { getCaseTimeline } from '@/lib/repositories/cases'
import { getProfilesByCongrегation } from '@/lib/repositories/profiles'
import { getClasses } from '@/lib/repositories/classes'
import { getCaseConfraternizacaoInfo } from '@/lib/repositories/events'
import { redirect, notFound } from 'next/navigation'
import { DiscipleDetailClient } from './client'

export default async function DiscipleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const { id } = await params
  const disciple = await getDiscipleById(id).catch(() => null)
  if (!disciple) notFound()

  // Garante que o discipulando pertence à congregação do usuário
  if (disciple.congregation_id !== profile.congregation_id && profile.role !== 'ADMIN_PLATAFORMA') {
    redirect('/discipulandos')
  }

  const activeCase = disciple.discipleship_cases?.[0] ?? null
  const [timeline, discipuladores, classes, confraternizacaoInfo] = await Promise.all([
    activeCase ? getCaseTimeline(activeCase.id) : Promise.resolve([]),
    getProfilesByCongrегation(profile.congregation_id),
    getClasses(profile.congregation_id),
    activeCase ? getCaseConfraternizacaoInfo(activeCase.id) : Promise.resolve({ hasAttended: false, preferredShift: null }),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <DiscipleDetailClient
        disciple={disciple as any}
        activeCase={activeCase as any}
        timeline={timeline}
        discipuladores={discipuladores}
        classes={classes.filter(c => c.is_active)}
        currentProfile={profile}
        hasAttendedConfraternizacao={confraternizacaoInfo.hasAttended}
        preferredShift={confraternizacaoInfo.preferredShift}
      />
    </div>
  )
}

import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getEventById, getAttendedCaseIds } from '@/lib/repositories/events'
import { getCases, getAcceptedFbvCaseIds } from '@/lib/repositories/cases'
import { getClassShifts } from '@/lib/repositories/class-shifts'
import { redirect, notFound } from 'next/navigation'
import { EventDetailClient } from './client'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')
  if (profile.role === 'DISCIPULADOR') redirect('/painel')

  const { id } = await params
  const [event, activeCases, attendedCaseIds, acceptedFbvCaseIds, shifts] = await Promise.all([
    getEventById(id).catch(() => null),
    getCases(profile.congregation_id, {
      status: ['EM_ACOLHIMENTO', 'PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO'],
    }),
    getAttendedCaseIds(profile.congregation_id),
    getAcceptedFbvCaseIds(profile.congregation_id),
    getClassShifts(profile.congregation_id, { activeOnly: true }),
  ])
  if (!event) notFound()

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <EventDetailClient
        event={event as any}
        activeCases={activeCases}
        attendedCaseIds={attendedCaseIds}
        acceptedFbvCaseIds={acceptedFbvCaseIds}
        shifts={shifts}
        currentProfile={profile}
      />
    </div>
  )
}

import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getEventById } from '@/lib/repositories/events'
import { getCases } from '@/lib/repositories/cases'
import { redirect, notFound } from 'next/navigation'
import { EventDetailClient } from './client'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const { id } = await params
  const [event, activeCases] = await Promise.all([
    getEventById(id).catch(() => null),
    getCases(profile.congregation_id, {
      status: ['PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO'],
    }),
  ])
  if (!event) notFound()

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <EventDetailClient
        event={event as any}
        activeCases={activeCases}
        currentProfile={profile}
      />
    </div>
  )
}

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
  const event = await getEventById(id).catch(() => null)
  if (!event) notFound()

  const activeCases = await getCases(profile.congregation_id, {
    status: ['PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO'],
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <EventDetailClient
        event={event as any}
        activeCases={activeCases}
        currentProfile={profile}
      />
    </div>
  )
}

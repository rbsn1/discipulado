import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getEvents } from '@/lib/repositories/events'
import { redirect } from 'next/navigation'
import { ConfraternizacaoClient } from './client'

export default async function ConfraternizacaoPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const events = await getEvents(profile.congregation_id)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <ConfraternizacaoClient
        events={events}
        congregationId={profile.congregation_id}
        currentProfile={profile}
      />
    </div>
  )
}

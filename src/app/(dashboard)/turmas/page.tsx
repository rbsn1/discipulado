import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getClasses } from '@/lib/repositories/classes'
import { getClassShifts } from '@/lib/repositories/class-shifts'
import { redirect } from 'next/navigation'
import { TurmasClient } from './client'

export default async function TurmasPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')
  if (profile.role === 'DISCIPULADOR') redirect('/acolhimento')

  const [classes, shifts] = await Promise.all([
    getClasses(profile.congregation_id),
    getClassShifts(profile.congregation_id, { activeOnly: true }),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <TurmasClient
        classes={classes}
        shifts={shifts}
        congregationId={profile.congregation_id}
        currentRole={profile.role}
      />
    </div>
  )
}

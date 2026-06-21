import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getClasses } from '@/lib/repositories/classes'
import { redirect } from 'next/navigation'
import { TurmasClient } from './client'

export default async function TurmasPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')

  const classes = await getClasses(profile.congregation_id)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <TurmasClient
        classes={classes}
        congregationId={profile.congregation_id}
        currentRole={profile.role}
      />
    </div>
  )
}

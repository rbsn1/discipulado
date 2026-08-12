import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getClassShifts } from '@/lib/repositories/class-shifts'
import { redirect } from 'next/navigation'
import { TurnosClient } from './client'

export default async function TurnosPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')
  if (!['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(profile.role)) redirect('/admin')

  const shifts = await getClassShifts(profile.congregation_id)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <TurnosClient shifts={shifts} />
    </div>
  )
}

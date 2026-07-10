import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getWorshipServices } from '@/lib/repositories/worship-services'
import { redirect } from 'next/navigation'
import { CultosClient } from './client'

export default async function CultosPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')
  if (!['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(profile.role)) redirect('/admin')

  const services = await getWorshipServices(profile.congregation_id)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <CultosClient services={services} />
    </div>
  )
}

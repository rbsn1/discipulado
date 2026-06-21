import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getModuleTemplates } from '@/lib/repositories/modules'
import { redirect } from 'next/navigation'
import { ModulosClient } from './client'

export default async function ModulosPage() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) redirect('/painel')
  if (!['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(profile.role)) redirect('/admin')

  const modules = await getModuleTemplates(profile.congregation_id)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <ModulosClient modules={modules} currentProfile={profile} />
    </div>
  )
}

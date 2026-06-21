import { getCurrentProfile, getAllProfiles, getProfilesByCongrегation } from '@/lib/repositories/profiles'
import { redirect } from 'next/navigation'
import { UsuariosClient } from './client'
import { createClient } from '@/lib/supabase/server'

export default async function UsuariosPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)) redirect('/admin')

  const isPlatformAdmin = profile.role === 'ADMIN_PLATAFORMA'
  const profiles = isPlatformAdmin
    ? await getAllProfiles()
    : await getProfilesByCongrегation(profile.congregation_id!)

  const supabase = await createClient()
  const { data: congregations } = await supabase
    .from('congregations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <UsuariosClient
        profiles={profiles}
        congregations={congregations ?? []}
        currentProfile={profile}
      />
    </div>
  )
}

import { getCurrentProfile } from '@/lib/repositories/profiles'
import { isFbvEnabled } from '@/lib/repositories/congregations'
import { redirect } from 'next/navigation'
import { BoasVindasClient } from './client'

export default async function BoasVindasAdminPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)) redirect('/painel')
  // A opção é por congregação — admin de plataforma sem congregação não tem o que ligar
  if (!profile.congregation_id) redirect('/admin')

  const enabled = await isFbvEnabled(profile.congregation_id)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <BoasVindasClient enabled={enabled} />
    </div>
  )
}

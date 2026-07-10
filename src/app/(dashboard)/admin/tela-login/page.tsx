import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getPlatformSettings } from '@/lib/repositories/platform-settings'
import { redirect } from 'next/navigation'
import { TelaLoginClient } from './client'

export default async function TelaLoginPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'ADMIN_PLATAFORMA') redirect('/admin')

  const settings = await getPlatformSettings()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <TelaLoginClient settings={settings} />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) redirect('/login')
  if (!profile.is_active) redirect('/login')

  let congregationName: string | undefined
  let theme: { logoUrl?: string | null; accentColor?: string; sidebarColor?: string } | undefined

  if (profile.congregation_id) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('congregations')
      .select('name, logo_url, accent_color, sidebar_color')
      .eq('id', profile.congregation_id)
      .single()
    congregationName = data?.name
    theme = {
      logoUrl:      data?.logo_url,
      accentColor:  data?.accent_color ?? '#4F46E5',
      sidebarColor: data?.sidebar_color ?? '#0F172A',
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile} congregationName={congregationName} theme={theme} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}

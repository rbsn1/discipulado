import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) redirect('/login')
  if (!profile.is_active) redirect('/login')

  let congregationName: string | undefined

  if (profile.congregation_id) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('congregations')
      .select('name')
      .eq('id', profile.congregation_id)
      .single()
    congregationName = data?.name
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile} congregationName={congregationName} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}

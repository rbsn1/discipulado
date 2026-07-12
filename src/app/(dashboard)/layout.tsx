import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getMyAccessStatus } from '@/lib/repositories/congregations'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) redirect('/login')
  if (!profile.is_active) redirect('/login')

  if (profile.role !== 'ADMIN_PLATAFORMA') {
    const access = await getMyAccessStatus()
    if (access?.blocked) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] p-6">
          <div className="max-w-sm text-center">
            <h1 className="text-xl font-bold text-[#1C1B1A]">Acesso suspenso</h1>
            <p className="mt-2 text-sm text-[#6B6963]">
              {access.reason === 'overdue'
                ? `A mensalidade de ${access.congregation_name} está vencida.`
                : `O acesso de ${access.congregation_name} foi desativado.`}
            </p>
            <p className="mt-4 text-sm text-[#6B6963]">
              Entre em contato com o administrador da plataforma para regularizar.
            </p>
          </div>
        </div>
      )
    }
  }

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
    <DashboardShell
      profile={profile}
      congregationName={congregationName}
      theme={theme}
    >
      {children}
    </DashboardShell>
  )
}

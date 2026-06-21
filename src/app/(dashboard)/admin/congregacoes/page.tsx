import { getCurrentProfile } from '@/lib/repositories/profiles'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CongregacoesClient } from './client'

export default async function CongregacoesPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ADMIN_PLATAFORMA') redirect('/admin')

  const supabase = await createClient()
  const { data: congregations } = await supabase
    .from('congregations')
    .select('*')
    .order('name')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <CongregacoesClient congregations={congregations ?? []} />
    </div>
  )
}
